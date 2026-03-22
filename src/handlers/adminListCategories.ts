import { verifyJwt } from "../utils/auth";
import { AdminCategoryService } from "../services/adminCategory.service";

const service = new AdminCategoryService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const qs = event.queryStringParameters || {};
        const limit = Number(qs.limit) || 20;
        const cursor = qs.cursor;
        const search = qs.search || "";
        const isActive = qs.isActive;

        const data = await service.listCategories({
            limit,
            cursor,
            search,
            isActive,
        });

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error("AdminListCategories error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};