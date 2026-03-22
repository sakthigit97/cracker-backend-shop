import * as XLSX from "xlsx";
import { verifyJwt } from "../utils/auth";
import { s3 } from "../utils/aws";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { validateImportRows } from "../services/productImportValidator";

const BUCKET = process.env.BUCKET_NAME!;
const BRAND_TABLE = process.env.BRAND_TABLE!;
const CATEGORY_TABLE = process.env.CATEGORY_TABLE!;
const PREVIEW_LIMIT = 20;

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

        const { validRows, errors } = await validateImportRows(
            rows,
            BRAND_TABLE,
            CATEGORY_TABLE
        );

        return response(200, {
            importId,
            totalRows: rows.length,
            validRows: validRows.length,
            invalidRows: rows.length - validRows.length,
            errors,
            preview: validRows.slice(0, PREVIEW_LIMIT),
        });
    } catch (err) {
        console.error("ValidateImport error", err);
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

function response(statusCode: number, body: any) {
    return {
        statusCode,
        body: JSON.stringify(
            typeof body === "string" ? { message: body } : body
        ),
    };
}