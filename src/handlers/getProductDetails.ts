import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { getActiveDiscounts } from "../services/discount.service";
import { applyDiscount } from "../services/price.service";
import { success, error } from "../libs/response";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const productId = event.pathParameters?.productId;
        const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;

        if (!productId) {
            return error("productId is required", 400);
        }

        const productRes = await ddb.send(
            new GetCommand({
                TableName: PRODUCTS_TABLE,
                Key: {
                    productId,
                },
            })
        );

        if (!productRes.Item || productRes.Item.isActive !== "true") {
            return error("Product not found", 404);
        }

        const discounts = await getActiveDiscounts();
        const priceInfo = applyDiscount(productRes.Item, discounts);
        const product = {
            id: productRes.Item.productId,
            name: productRes.Item.name,
            description: productRes.Item.description ?? null,
            images: productRes.Item.imageUrls ?? [],
            price: priceInfo.price,
            originalPrice: priceInfo.originalPrice,
            discountText: priceInfo.discountText,
            categoryId: productRes.Item.categoryId,
            brandId: productRes.Item.brandId,
            youtubeUrl: productRes.Item.videoUrl ?? null,
            qty: productRes.Item.quantity ?? 0,
            isComboPackage: productRes.Item.isComboPackage || false,
            isBulkOnly: productRes.Item.isBulkOnly || false,
            cartonQty: productRes.Item.cartonQty || 0,
            scheme1Price: productRes.Item.scheme1Price || 0,
            scheme2Price: productRes.Item.scheme2Price || 0,
            scheme3Price: productRes.Item.scheme3Price || 0,
            scheme4Price: productRes.Item.scheme4Price || 0,
        };

        return success(product);
    } catch (err) {
        console.error("getProductDetails error:", err);
        return error("Failed to fetch product details", 500);
    }
};