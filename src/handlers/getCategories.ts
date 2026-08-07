import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { ddb } from "../utils/dynamo";
import { success, error } from "../libs/response";

const CATEGORY_TABLE = process.env.CATEGORY_TABLE!;
export const handler: APIGatewayProxyHandler = async () => {
  try {
    let items: any[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const res = await ddb.send(
        new ScanCommand({
          TableName: CATEGORY_TABLE,
          FilterExpression: "isActive = :active",
          ExpressionAttributeValues: {
            ":active": true,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      items.push(...(res.Items ?? []));
      lastEvaluatedKey = res.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const categories = items
      .sort(
        (a: any, b: (any)) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      )
      .map((c: any) => ({
        id: c.categoryId,
        name: c.name,
        image: c.imageUrl,
        sortOrder: c.sortOrder ?? 0,
      }));


    return success({ items: categories });
  } catch (err) {
    console.error("getCategories error:", err);
    return error("Failed to fetch categories", 500);
  }
};