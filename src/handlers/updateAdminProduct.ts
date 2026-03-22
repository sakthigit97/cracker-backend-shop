import { verifyJwt } from "../utils/auth";
import { AdminUpdateProductService } from "../services/adminUpdateProduct.service";

const service = new AdminUpdateProductService();
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

        if (!event.body) {
            return { statusCode: 400, body: "Request body is required" };
        }

        const body = JSON.parse(event.body);
        const updated = await service.updateProduct(productId, body);

        if (!updated) {
            return { statusCode: 404, body: "Product not found or no changes" };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(updated),
        };
    } catch (err) {
        console.error("AdminUpdateProduct error", err);
        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};