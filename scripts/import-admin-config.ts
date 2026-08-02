import * as XLSX from "xlsx";

import {
    DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
    DynamoDBDocumentClient,
    BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

import {
    unmarshall,
} from "@aws-sdk/util-dynamodb";

const REGION = "ap-south-1";
const TABLE_NAME = "AdminConfig-dev";
const FILE = "./data/adminconfig.csv";

const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({
        region: REGION,
    })
);

function parseAttributeValue(value: any) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return value;
    }

    if (typeof value !== "string") {
        return value;
    }

    const trimmed = value.trim();

    if (
        !trimmed.startsWith("{") &&
        !trimmed.startsWith("[")
    ) {
        return value;
    }

    try {
        return unmarshall({
            value: JSON.parse(trimmed),
        }).value;
    } catch {
        return value;
    }
}

async function main() {

    console.log("Reading CSV...");

    const workbook = XLSX.readFile(FILE);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
    });

    console.log(`Found ${rows.length} config records`);

    const items = rows.map((row) => {

        const item: any = { ...row };

        // Convert exported DynamoDB JSON fields back to objects/lists
        item.sliderImages = parseAttributeValue(item.sliderImages);
        item.packageTags = parseAttributeValue(item.packageTags);
        item.aiTags = parseAttributeValue(item.aiTags);
        item.whatsAppSupport = parseAttributeValue(item.whatsAppSupport);
        item.bulkSchemes = parseAttributeValue(item.bulkSchemes);

        return item;
    });

    for (let i = 0; i < items.length; i += 25) {

        const batch = items.slice(i, i + 25);

        let requestItems: any = {
            [TABLE_NAME]: batch.map((item) => ({
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

            if (!unprocessed?.length) {
                break;
            }

            console.log(
                `Retrying ${unprocessed.length} items...`
            );

            requestItems = {
                [TABLE_NAME]: unprocessed,
            };

            await new Promise((r) =>
                setTimeout(r, 1000)
            );
        }

        console.log(
            `Imported ${Math.min(
                i + 25,
                items.length
            )}/${items.length}`
        );
    }

    console.log("");
    console.log("AdminConfig imported successfully.");
}

main().catch(console.error);