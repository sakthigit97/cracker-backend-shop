import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.PRODUCTS_TABLE!;
export class AdminCreateProductRepository {
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