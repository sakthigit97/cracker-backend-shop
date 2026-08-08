import * as XLSX from "xlsx";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { s3 } from "../utils/aws";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION;
const client = new DynamoDBClient({
    region: REGION,
});

const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.ADMIN_CONFIG_TABLE!;
const CONFIG_ID = "global";
const BUCKET = process.env.BUCKET_NAME!;

async function getFileFromS3(key: string): Promise<Buffer> {
    const res = await s3.send(
        new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
    );

    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as any) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}


export const handler = async () => {
    try {
        console.log("Reading Excel...");

        const s3Key = `imports/bulk-ai-tags.xlsx`;
        const fileBuffer = await getFileFromS3(s3Key);
        console.log(fileBuffer)

        const workbook = XLSX.read(fileBuffer, { type: "buffer" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        console.log('sheeeeeeeeeeeeeeeeeeeeeeeeeet')

        console.log(sheet)

        const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: "",
        });

        const seen = new Set<string>();

        const aiTags = rows
            .map((row) => {
                const name = String(row[0] || "").trim();

                if (!name) {
                    return null;
                }

                const id = name
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, "-");

                if (seen.has(id)) {
                    return null;
                }

                seen.add(id);

                return {
                    id,
                    name,
                };
            })
            .filter(Boolean);

        console.log(`Found ${aiTags.length} AI Tags`);

        const existing = await ddb.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    configId: CONFIG_ID,
                },
            })
        );

        if (!existing.Item) {
            throw new Error("Global config not found");
        }

        const updated = {
            ...existing.Item,
            aiTags,
            updatedAt: new Date().toISOString(),
        };

        await ddb.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: updated,
            })
        );

        console.log(
            `Successfully updated ${aiTags.length} AI Tags`
        );

        return {
            success: true,
            total: aiTags.length,
        };
    } catch (err) {
        console.error(err);

        return {
            success: false,
            error: err,
        };
    }
};