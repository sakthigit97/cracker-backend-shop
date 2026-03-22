import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getActiveProducts } from "../services/product.service";
import { getActiveDiscounts } from "../services/discount.service";
import { applyDiscount } from "../services/price.service";
import { encodeCursor, decodeCursor } from "../libs/pagination";
import { success, error } from "../libs/response";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const limit = Math.min(
            Number(event.queryStringParameters?.limit) || 20,
            50
        );
        const search = event.queryStringParameters?.search?.trim();
        const cursor = decodeCursor(
            event.queryStringParameters?.cursor
        );

        const [{ items, lastKey }, discounts] =
            await Promise.all([
                getActiveProducts(limit, cursor, search),
                getActiveDiscounts(),
            ]);

        const products = items.map((p: any) => {
            const priceInfo = applyDiscount(p, discounts);
            return {
                id: p.productId,
                name: p.name,
                image: p.imageUrls?.[0] ?? null,
                price: priceInfo.price,
                originalPrice: priceInfo.originalPrice,
                discountText: priceInfo.discountText,
                categoryId: p.categoryId,
                brandId: p.brandId,
            };
        });
        return success({
            items: products,
            pagination: {
                nextCursor: encodeCursor(lastKey),
            },
        });
    } catch (err) {
        console.error("getProducts error:", err);
        return error("Failed to fetch products", 500);
    }
};