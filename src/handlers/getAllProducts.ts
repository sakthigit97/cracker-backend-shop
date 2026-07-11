import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getAllActiveProducts } from "../services/product.service";
import { getActiveDiscounts } from "../services/discount.service";
import { applyDiscount } from "../services/price.service";
import { success, error } from "../libs/response";

export const handler: APIGatewayProxyHandlerV2 = async () => {
    try {
        const [items, discounts] = await Promise.all([
            getAllActiveProducts(),
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
                qty: p.quantity,
            };
        });

        return success({
            items: products,
            pagination: {
                nextCursor: null,
            },
        });
    } catch (err) {
        console.error("getAllProducts error:", err);
        return error("Failed to fetch products", 500);
    }
};