import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../utils/aws";
import { verifyJwt } from "../utils/auth";

const BUCKET = process.env.BUCKET_NAME!;

export const handler = async (event: any) => {
    try {
        const { userId, role } = verifyJwt(event);

        if (role !== "admin") {
            return response(403, "Forbidden");
        }
        const adminId = userId;
        const body = JSON.parse(event.body || "{}");
        const { fileName } = body;

        if (!fileName || typeof fileName !== "string") {
            return response(400, "fileName is required");
        }

        if (!fileName.endsWith(".xlsx")) {
            return response(400, "Only .xlsx files are allowed");
        }

        if (fileName.includes("/") || fileName.includes("\\")) {
            return response(400, "Invalid fileName");
        }
        const importId = `imp-${randomUUID()}`;
        const s3Key = `imports/${adminId}/${importId}.xlsx`;
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: s3Key
        });

        const uploadUrl = await getSignedUrl(s3, command, {
            expiresIn: 300
        });

        return response(200, {
            importId,
            uploadUrl,
            s3Key,
        });
    } catch (err) {
        console.error("Import upload-url error", err);
        return response(500, err);
    }
};

function response(statusCode: number, body: any) {
    return {
        statusCode,
        body: JSON.stringify(
            typeof body === "string" ? { message: body } : body
        ),
    };
}