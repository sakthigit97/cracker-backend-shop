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

        await service.deleteCategory(categoryId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Category deleted successfully",
            }),
        };
    } catch (err) {
        console.error("AdminDeleteCategory error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};
