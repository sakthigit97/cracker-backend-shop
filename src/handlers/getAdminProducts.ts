import { verifyJwt } from "../utils/auth";
import { AdminProductsService } from "../services/adminProducts.service";

const service = new AdminProductsService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const qs = event.queryStringParameters || {};
        const limit = Math.min(Number(qs.limit) || 20, 25);
        const cursor = qs.cursor
            ? JSON.parse(Buffer.from(qs.cursor, "base64").toString("utf8"))
            : undefined;

        const params = {
            brandId: qs.brandId,
            categoryId: qs.categoryId,
            isActive: qs.isActive,
            search: qs?.search?.trim(),
            limit,
            cursor,
        };

        const result = await service.getProducts(params);
        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (err) {
        console.error("AdminProducts error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};