import { verifyJwt } from "../utils/auth";
import { AdminDeactivateProductService } from "../services/adminDeactivateProduct.service";

const service = new AdminDeactivateProductService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const productId = event.pathParameters?.productId;
        if (!productId) {
            return { statusCode: 400, body: "productId is required" };
        }

        const updated = await service.toggleProduct(productId);

        if (!updated) {
            return { statusCode: 404, body: "Product not found" };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(updated),
        };
    } catch (err) {
        console.error("AdminDeactivateProduct error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};