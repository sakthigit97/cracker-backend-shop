import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { ddb } from "../utils/dynamo";
import { success, error } from "../libs/response";

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const res = await ddb.send(
      new ScanCommand({
        TableName: "Brands",
        FilterExpression: "isActive = :active",
        ExpressionAttributeValues: {
          ":active": true,
        },
      })
    );

    const items =
      res.Items?.map((b: any) => ({
        id: b.brandId,
        name: b.name,
        image: b.logoUrl,
      })) || [];

    return success({ items });
  } catch (err) {
    console.error("getBrands error:", err);
    return error("Failed to fetch brands", 500);
  }
};
