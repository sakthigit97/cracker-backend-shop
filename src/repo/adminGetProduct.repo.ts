import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.PRODUCTS_TABLE!;
export class AdminGetProductRepository {
    async getById(productId: string) {
        const res = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: { productId },
            })
        );

        return res.Item || null;
    }
}