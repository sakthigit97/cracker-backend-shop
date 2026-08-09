import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "./aws";
import { randomUUID } from "crypto";

const BUCKET = process.env.BUCKET_NAME!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;
const STAGE = process.env.STAGE;

export async function getPresignedUploads(
    productId: string,
    files: { name: string; type: string }[]
) {
    return Promise.all(
        files.map(async (file) => {
            const key = `products/${productId}/images/${randomUUID()}-${file.name}`;
            const uploadUrl = await getSignedUrl(
                s3,
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                    ContentType: file.type,
                }),
                { expiresIn: 300 }
            );

            const fileUrl = STAGE === "prod"
                ? `https://${CLOUDFRONT_DOMAIN}/${key}`
                : `https://${BUCKET}.s3.amazonaws.com/${key}`;

            return {
                uploadUrl,
                fileUrl,
            };
        })
    );
}