import * as XLSX from "xlsx";
import { randomUUID } from "crypto";
import { verifyJwt } from "../utils/auth";
import { s3, ddb } from "../utils/aws";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { validateImportRows } from "../services/productImportValidator";

const BUCKET = process.env.BUCKET_NAME!;
const PRODUCT_TABLE = process.env.PRODUCTS_TABLE!;
const BRAND_TABLE = process.env.BRAND_TABLE!;
const CATEGORY_TABLE = process.env.CATEGORY_TABLE!;

export const handler = async (event: any) => {
    try {
        const { userId, role } = verifyJwt(event);
        if (role !== "admin") {
            return response(403, "Forbidden");
        }

        const { importId } = JSON.parse(event.body || "{}");
        if (!importId) {
            return response(400, "importId is required");
        }

        const s3Key = `imports/${userId}/${importId}.xlsx`;
        const fileBuffer = await getFileFromS3(s3Key);

        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const { validRows } = await validateImportRows(
            rows,
            BRAND_TABLE,
            CATEGORY_TABLE
        );

        if (validRows.length === 0) {
            return response(400, "No valid rows to import");
        }

        const now = new Date().toISOString();
        const putRequests = validRows.map((item: any) => ({
            PutRequest: {
                Item: {
                    productId: { S: `prod-${randomUUID()}` },
                    name: { S: item.name },
                    description: { S: item.description ?? "" },
                    price: { N: String(item.price) },
                    quantity: { N: String(item.quantity ?? 0) },
                    brandId: { S: item.brandId },
                    categoryId: { S: item.categoryId },
                    searchText: {
                        S: `${item.name} ${item.brandId} ${item.categoryId}`.toLowerCase(),
                    },
                    isActive: { S: String(item.isActive ?? true) },
                    createdAt: { S: now },
                },
            },
        }));

        await batchWriteAll(PRODUCT_TABLE, putRequests);
        return response(200, {
            importId,
            created: putRequests.length,
            skipped: rows.length - putRequests.length,
            status: "COMPLETED",
        });
    } catch (err) {
        console.error("ConfirmImport error", err);
        return response(500, "Internal Server Error");
    }
};

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

async function batchWriteAll(
    table: string,
    items: any[],
    batchSize = 25
) {
    for (let i = 0; i < items.length; i += batchSize) {
        await ddb.send(
            new BatchWriteItemCommand({
                RequestItems: {
                    [table]: items.slice(i, i + batchSize),
                },
            })
        );
    }
}

function response(statusCode: number, body: any) {
    return {
        statusCode,
        body: JSON.stringify(
            typeof body === "string" ? { message: body } : body
        ),
    };
}