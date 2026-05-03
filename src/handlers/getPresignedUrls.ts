import { verifyJwt } from "../utils/auth";
import { randomUUID } from "crypto";
import { getPresignedUploads } from "../utils/presign";

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const body = JSON.parse(event.body || "{}");
        const files = body.files || [];

        if (!Array.isArray(files) || !files.length) {
            return { statusCode: 400, body: "files required" };
        }

        if (files.length > 3) {
            return { statusCode: 400, body: "Max 3 images allowed" };
        }

        for (const f of files) {
            if (!f.type.startsWith("image/")) {
                return { statusCode: 400, body: "Only images allowed" };
            }
        }

        const productId = `prod-${randomUUID()}`;
        const uploads = await getPresignedUploads(productId, files);

        return {
            statusCode: 200,
            body: JSON.stringify({ productId, uploads }),
        };
    } catch (err: any) {
        console.error("Presign error", err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: err?.message || "Internal Server Error",
            })
        };
    }
};