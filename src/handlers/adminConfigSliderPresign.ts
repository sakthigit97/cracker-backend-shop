import { verifyJwt } from "../utils/auth";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../utils/aws";

const BUCKET = process.env.BUCKET_NAME!;
const REGION = process.env.AWS_REGION || "ap-south-1";

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const body = JSON.parse(event.body || "{}");
        const { fileName, contentType } = body;

        if (!fileName || !contentType) {
            return { statusCode: 400, body: "Invalid file data" };
        }

        const sliderId = `slider-${randomUUID()}`;
        const key = `config/sliders/${sliderId}/${randomUUID()}-${fileName}`;
        const uploadUrl = await getSignedUrl(
            s3,
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                ContentType: contentType,
            }),
            { expiresIn: 300 }
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                uploadUrl,
                fileUrl: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`,
                sliderId,
            }),
        };
    } catch (err: any) {
        console.error("PresignConfigSlider error", err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: err?.message || "Internal Server Error",
            })
        };
    }
};