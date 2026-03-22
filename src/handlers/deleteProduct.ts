import { verifyJwt } from "../utils/auth";
import { ProductService } from "../services/product.service";

const service = new ProductService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const productId = event.pathParameters?.productId;

        if (!productId) {
            return { statusCode: 400, body: "Product ID required" };
        }

        await service.deleteProduct(productId);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Product deleted successfully" }),
        };
    } catch (err) {
        console.error("DeleteProduct error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};