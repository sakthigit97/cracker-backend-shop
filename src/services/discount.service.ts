import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const DISCOUNT_TABLE = "Discounts";

export async function getActiveDiscounts() {
  const res = await ddb.send(
    new ScanCommand({
      TableName: DISCOUNT_TABLE,
      FilterExpression: "isActive = :true",
      ExpressionAttributeValues: {
        ":true": true,
      },
    })
  );

  return res.Items || [];
}