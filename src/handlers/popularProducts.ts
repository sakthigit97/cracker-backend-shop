import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { PopularProductsService } from "../services/popularProducts.service";
import { getActiveDiscounts } from "../services/discount.service";
import { applyDiscount } from "../services/price.service";
import { success, error } from "../libs/response";

const service = new PopularProductsService();

export const handler: APIGatewayProxyHandlerV2 = async () => {
    try {
        const limit = 10;

        const [{ items }, discounts] = await Promise.all([
            service.getPopularProducts({ limit }),
            getActiveDiscounts(),
        ]);

        const products = items.map((p: any) => {
            const priceInfo = applyDiscount(p, discounts);

            return {
                id: p.productId,
                name: p.name,
                image: p.imageUrls?.[0] ?? p.image ?? null,
                price: priceInfo.price,
                originalPrice:
                    priceInfo.originalPrice > priceInfo.price
                        ? priceInfo.originalPrice
                        : undefined,
                discountText: priceInfo.discountText,
                categoryId: p.categoryId,
                brandId: p.brandId,
                qty: p.quantity ?? p.qty,
            };
        });

        return success({
            items: products,
        });

    } catch (err) {
        console.error(err);
        return error("Failed to fetch popular products", 500);
    }
};