import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "ap-south-1" });
export const handler = async () => {
    try {
        const command = new GetObjectCommand({
            Bucket: "cracker-app",
            Key: "templates/product-import-template.xlsx",
        });

        const url = await getSignedUrl(s3, command, {
            expiresIn: 3600,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ url }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: "Failed to generate URL",
        };
    }
};