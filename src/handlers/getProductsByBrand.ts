import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { getActiveDiscounts } from "../services/discount.service";
import { applyDiscount } from "../services/price.service";
import { encodeCursor, decodeCursor } from "../libs/pagination";
import { success, error } from "../libs/response";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const brandId = event.pathParameters?.brandId;

    if (!brandId) {
      return error("brandId is required", 400);
    }

    const limit = Math.min(
      Number(event.queryStringParameters?.limit) || 8,
      50
    );

    const cursor = decodeCursor(
      event.queryStringParameters?.cursor
    );

    const [res, discounts] = await Promise.all([
      ddb.send(
        new QueryCommand({
          TableName: "Products",
          IndexName: "brandId-index",
          KeyConditionExpression: "brandId = :bid",
          FilterExpression: "isActive = :active",
          ExpressionAttributeValues: {
            ":bid": brandId,
            ":active": "true",
          },
          Limit: limit,
          ExclusiveStartKey: cursor,
        })
      ),
      getActiveDiscounts(),
    ]);

    const products =
      res.Items?.map((p: any) => {
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
          qty: p.quantity
        };
      }) || [];

    return success({
      items: products,
      pagination: {
        nextCursor: encodeCursor(res.LastEvaluatedKey),
      },
    });
  } catch (err) {
    console.error("getProductsByBrand error:", err);
    return error("Failed to fetch brand products", 500);
  }
};
