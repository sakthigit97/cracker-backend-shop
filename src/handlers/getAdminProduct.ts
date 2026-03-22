import { verifyJwt } from "../utils/auth";
import { AdminGetProductService } from "../services/adminGetProduct.service";

const service = new AdminGetProductService();
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

        const product = await service.getProduct(productId);
        if (!product) {
            return { statusCode: 404, body: "Product not found" };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(product),
        };
    } catch (err) {
        console.error("AdminGetProduct error", err);
        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};