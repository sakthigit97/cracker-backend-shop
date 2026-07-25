import { verifyJwt } from "../utils/auth";
import { deleteImagesFromS3 } from "../utils/s3Delete";

export const handler = async (event: any) => {
    try {
        verifyJwt(event);


        const body = JSON.parse(event.body || "{}");
        const imageUrls: string[] = body.imageUrls || [];
        await deleteImagesFromS3(imageUrls);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
            }),
        };
    } catch (err: any) {
        console.error(err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message || "Failed to delete images",
            }),
        };
    }
};