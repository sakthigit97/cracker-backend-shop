import { BatchGetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE_NAME = process.env.PRODUCTS_TABLE!;
export class ProductRepository {
    async batchGet(productIds: string[]) {
        if (productIds.length === 0) return [];

        const keys = productIds.map((productId) => ({
            productId,
        }));

        const res = await ddb.send(
            new BatchGetCommand({
                RequestItems: {
                    [TABLE_NAME]: { Keys: keys },
                },
            })
        );

        return res.Responses?.[TABLE_NAME] ?? [];
    }

    async deleteProduct(productId: string) {
        await ddb.send(
            new DeleteCommand({
                TableName: process.env.PRODUCTS_TABLE!,
                Key: { productId },
            })
        );
    }
}
