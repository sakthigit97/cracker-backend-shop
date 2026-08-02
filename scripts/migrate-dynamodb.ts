import {
    DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
    DynamoDBDocumentClient,
    ScanCommand,
    BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const args = process.argv.slice(2);

if (args.length !== 4) {
    console.log(`
Usage:

node migrate-dynamodb.js \
<source-table> \
<source-region> \
<destination-table> \
<destination-region>

Example:

node migrate-dynamodb.js \
Products-dev \
ap-south-1 \
Products-prod \
us-east-1
`);
    process.exit(1);
}

const [
    sourceTable,
    sourceRegion,
    destinationTable,
    destinationRegion,
] = args;

const sourceClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({
        region: sourceRegion,
    })
);

const destinationClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({
        region: destinationRegion,
    })
);

async function scanAllItems() {
    let items: any[] = [];
    let lastKey: any;

    console.log("Scanning table...");

    do {
        const res = await sourceClient.send(
            new ScanCommand({
                TableName: sourceTable,
                ExclusiveStartKey: lastKey,
            })
        );

        items.push(...(res.Items ?? []));

        lastKey = res.LastEvaluatedKey;

        console.log(`Fetched ${items.length} items`);
    } while (lastKey);

    return items;
}

async function batchWrite(items: any[]) {

    let uploaded = 0;

    while (items.length) {

        const batch = items.splice(0, 25);

        let requestItems = {
            [destinationTable]: batch.map((item) => ({
                PutRequest: {
                    Item: item,
                },
            })),
        };

        while (true) {

            const res = await destinationClient.send(
                new BatchWriteCommand({
                    RequestItems: requestItems,
                })
            );

            const unprocessed =
                res.UnprocessedItems?.[destinationTable] ?? [];

            uploaded +=
                requestItems[destinationTable].length - unprocessed.length;

            console.log(`Uploaded ${uploaded}`);

            if (!unprocessed.length) break;

            console.log(
                `Retrying ${unprocessed.length} unprocessed items...`
            );

            requestItems = {
                [destinationTable]: unprocessed as any,
            };
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
}

async function migrate() {

    console.log("=================================");
    console.log(" DynamoDB Migration Utility");
    console.log("=================================\n");

    console.log("Source");
    console.log(`${sourceTable}`);
    console.log(`${sourceRegion}\n`);

    console.log("Destination");
    console.log(`${destinationTable}`);
    console.log(`${destinationRegion}\n`);

    const items = await scanAllItems();

    console.log(`\nTotal Items : ${items.length}\n`);

    console.log("Uploading...\n");

    await batchWrite(items);

    console.log("\n=================================");
    console.log("Migration Completed Successfully");
    console.log("=================================");
}

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});