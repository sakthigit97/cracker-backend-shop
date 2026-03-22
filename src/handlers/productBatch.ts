import { ProductService } from "../services/product.service";
const service = new ProductService();

export const handler = async (event: any) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const productIds: string[] = body.productIds;

        if (!Array.isArray(productIds)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "productIds must be an array",
                }),
            };
        }

        const items = await service.batchGetProducts(productIds);
        return {
            statusCode: 200,
            body: JSON.stringify({ items }),
        };
    } catch (err: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message || "Internal error",
            }),
        };
    }
};