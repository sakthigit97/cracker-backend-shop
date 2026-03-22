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

        if (!body.name?.trim()) {
            return { statusCode: 400, body: "name is required" };
        }

        if (!body.imageUrl) {
            return { statusCode: 400, body: "imageUrl is required" };
        }

        const updated = await service.updateCategory(categoryId, {
            name: body.name.trim(),
            imageUrl: body.imageUrl,
            isActive: body.isActive === true,
        });

        return {
            statusCode: 200,
            body: JSON.stringify(updated),
        };
    } catch (err) {
        console.error("AdminUpdateCategory error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};