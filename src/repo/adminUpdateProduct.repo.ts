import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.PRODUCTS_TABLE!;
export class AdminUpdateProductRepository {
    async updateProduct(productId: string, input: Record<string, any>) {
        const expNames: Record<string, string> = {};
        const expValues: Record<string, any> = {};
        const updates: string[] = [];

        for (const [key, value] of Object.entries(input)) {
            if (value === undefined) continue;
            expNames[`#${key}`] = key;
            expValues[`:${key}`] = value;
            updates.push(`#${key} = :${key}`);
        }

        if (!updates.length) return null;
        const res = await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: { productId },
                UpdateExpression: `SET ${updates.join(", ")}`,
                ExpressionAttributeNames: expNames,
                ExpressionAttributeValues: expValues,
                ConditionExpression: "attribute_exists(productId)",
                ReturnValues: "ALL_NEW",
            })
        );

        return res.Attributes || null;
    }
}