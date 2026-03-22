import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.ORDERS_TABLE!;
export class AdminOrderDetailsRepository {

    async getOrderById(orderId: string) {
        const res = await ddb.send(
            new QueryCommand({
                TableName: TABLE,
                KeyConditionExpression: "#oid = :oid",
                ExpressionAttributeNames: {
                    "#oid": "orderId",
                },
                ExpressionAttributeValues: {
                    ":oid": orderId,
                },
                Limit: 1,
            })
        );

        return res.Items?.[0] || null;
    }
}