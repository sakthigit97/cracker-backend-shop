import { verifyJwt } from "../utils/auth";
import { AdminCategoryService } from "../services/adminCategory.service";

const service = new AdminCategoryService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const body = JSON.parse(event.body || "{}");

        if (!body.name) {
            return { statusCode: 400, body: "name is required" };
        }

        const data = await service.createCategory(body);

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error("AdminCreateCategory error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};