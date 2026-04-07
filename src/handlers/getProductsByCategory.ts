import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { getActiveDiscounts } from "../services/discount.service";
import { applyDiscount } from "../services/price.service";
import { encodeCursor, decodeCursor } from "../libs/pagination";
import { success, error } from "../libs/response";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const categoryId = event.pathParameters?.categoryId;

    if (!categoryId) {
      return error("categoryId is required", 400);
    }

    const limit = Math.min(
      Number(event.queryStringParameters?.limit) || 8,
      50
    );

    const search = event.queryStringParameters?.search?.trim();
    const searchLower = search?.toLowerCase();

    const cursor = decodeCursor(
      event.queryStringParameters?.cursor
    );

    let items: any[] = [];
    let lastKey = null;
    if (searchLower) {
      const params: any = {
        TableName: "Products",
        FilterExpression:
          "isActive = :active AND contains(#st, :q) AND #cid = :cid AND #qty >= :minQty",
        ExpressionAttributeNames: {
          "#st": "searchText",
          "#cid": "categoryId",
          "#qty": "quantity",
        },
        ExpressionAttributeValues: {
          ":active": "true",
          ":q": searchLower,
          ":cid": categoryId,
          ":minQty": 1,
        },
      };

      const res = await ddb.send(new ScanCommand(params));
      items = (res.Items || []).slice(0, limit);
      lastKey = res.LastEvaluatedKey;
    } else {
      const res = await ddb.send(
        new QueryCommand({
          TableName: "Products",
          IndexName: "categoryId-index",
          KeyConditionExpression: "categoryId = :cid",
          FilterExpression: "isActive = :active",
          ExpressionAttributeValues: {
            ":cid": categoryId,
            ":active": "true",
          },
          Limit: limit,
          ExclusiveStartKey: cursor,
        })
      );
      items = res.Items || [];
      lastKey = res.LastEvaluatedKey;
    }
    const discounts = await getActiveDiscounts();

    const products =
      items.map((p: any) => {
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
      }) || [];

    return success({
      items: products,
      pagination: {
        nextCursor: encodeCursor(lastKey),
      },
    });
  } catch (err) {
    console.error("getProductsByCategory error:", err);
    return error("Failed to fetch category products", 500);
  }
};