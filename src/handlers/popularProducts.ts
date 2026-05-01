import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { PopularProductsService } from "../services/popularProducts.service";
import { success, error } from "../libs/response";

const service = new PopularProductsService();

export const handler: APIGatewayProxyHandlerV2 = async () => {
    try {
        const limit = 10;

        const { items } = await service.getPopularProducts({ limit });
        const products = items.map((p: any) => ({
            id: p.productId,
            name: p.name,
            image: p.image ?? null,
            price: p.price,
            originalPrice: p.originalPrice,
            discountText: p.discountText,
            categoryId: p.categoryId,
            brandId: p.brandId,
            qty: p.qty,
        }));

        return success({
            items: products,
        });

    } catch (err) {
        console.error(err);
        return error("Failed to fetch popular products", 500);
    }
};