import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { ddb } from "../utils/dynamo";
import { success, error } from "../libs/response";

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const res = await ddb.send(
      new ScanCommand({
        TableName: "Categories",
        FilterExpression: "isActive = :active",
        ExpressionAttributeValues: {
          ":active": true,
        },
      })
    );

    const items =
      res.Items?.sort(
        (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      ).map((c: any) => ({
        id: c.categoryId,
        name: c.name,
        image: c.imageUrl,
        sortOrder: c.sortOrder ?? 0,
      })) || [];

    return success({ items });
  } catch (err) {
    console.error("getCategories error:", err);
    return error("Failed to fetch categories", 500);
  }
};
