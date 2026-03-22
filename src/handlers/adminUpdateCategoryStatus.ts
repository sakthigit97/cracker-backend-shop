import { verifyJwt } from "../utils/auth";
import { AdminCategoryService } from "../services/adminCategory.service";

const service = new AdminCategoryService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const categoryId = event.pathParameters?.categoryId;
        if (!categoryId) {
            return { statusCode: 400, body: "categoryId is required" };
        }

        const body = JSON.parse(event.body || "{}");
        const { isActive } = body;

        if (typeof isActive !== "boolean") {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "isActive must be boolean",
                }),
            };
        }

        const updated = await service.updateCategoryStatus(
            categoryId,
            isActive
        );

        return {
            statusCode: 200,
            body: JSON.stringify(updated),
        };
    } catch (err) {
        console.error("UpdateCategoryStatus error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};