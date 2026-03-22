import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.PRODUCTS_TABLE!;

export class AdminDeactivateProductRepository {
    async toggleStatus(productId: string) {
        const getRes = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: { productId },
                ProjectionExpression: "productId, isActive",
            })
        );

        if (!getRes.Item) {
            return null;
        }

        const nextStatus =
            getRes.Item.isActive === "true" ? "false" : "true";

        const updateRes = await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: { productId },
                UpdateExpression: "SET isActive = :v",
                ExpressionAttributeValues: {
                    ":v": nextStatus,
                },
                ReturnValues: "ALL_NEW",
            })
        );

        return updateRes.Attributes || null;
    }
}