import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3 } from "./aws";

const BUCKET = process.env.BUCKET_NAME!;
export async function deleteImagesFromS3(imageUrls: string[]) {
    if (!imageUrls.length) return;

    const objects = imageUrls.map((url) => {
        const key = decodeURIComponent(
            new URL(url).pathname.substring(1)
        );

        return {
            Key: key,
        };
    });

    await s3.send(
        new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: {
                Objects: objects,
            },
        })
    );
}