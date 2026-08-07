import * as XLSX from "xlsx";

import {
    DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
    DynamoDBDocumentClient,
    BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = "ap-south-1";
const TABLE_NAME = "Brands-dev";
const FILE = "./data/brand.csv";

const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({
        region: REGION,
    })
);

async function main() {
    const workbook = XLSX.readFile(FILE);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const items = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
    });

    console.log(`Found ${items.length} categories`);

    for (let i = 0; i < items.length; i += 25) {
        let requestItems: any = {
            [TABLE_NAME]: items
                .slice(i, i + 25)
                .map((item) => ({
                    PutRequest: {
                        Item: item,
                    },
                })),
        };

        while (true) {
            const result: any = await client.send(
                new BatchWriteCommand({
                    RequestItems: requestItems,
                })
            );

            const unprocessed =
                result.UnprocessedItems?.[TABLE_NAME];

            if (!unprocessed?.length) break;

            requestItems = {
                [TABLE_NAME]: unprocessed,
            };

            await new Promise((r) => setTimeout(r, 1000));
        }

        console.log(
            `Imported ${Math.min(i + 25, items.length)}/${items.length}`
        );
    }

    console.log("Categories imported successfully.");
}

main().catch(console.error);