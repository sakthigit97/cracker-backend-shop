import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.PRODUCTS_TABLE!;
export class AdminCreateProductRepository {

    async getNextSequenceNumber(categoryId: string): Promise<number> {
        const res = await ddb.send(
            new ScanCommand({
                TableName: TABLE,
                ProjectionExpression: "sequenceNumber",
                FilterExpression: "categoryId = :categoryId",
                ExpressionAttributeValues: {
                    ":categoryId": categoryId,
                },
            })
        );

        const maxSequence =
            Math.max(
                0,
                ...(res.Items ?? []).map((x: any) =>
                    Number(x.sequenceNumber ?? 0)
                )
            );

        return maxSequence + 1;
    }

    async putProduct(item: any) {
        await ddb.send(
            new PutCommand({
                TableName: TABLE,
                Item: item,
                ConditionExpression: "attribute_not_exists(productId)",
            })
        );
    }
}