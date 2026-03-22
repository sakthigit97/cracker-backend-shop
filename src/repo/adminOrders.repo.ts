import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.ORDERS_TABLE!;

export class AdminOrdersRepository {

    async getOrdersByStatus({
        status,
        limit,
        cursor,
        fromDate,
        toDate,
    }: {
        status: string;
        limit: number;
        cursor?: any;
        fromDate?: number;
        toDate?: number;
    }) {
        let filter = "";
        const values: any = {
            ":s": status,
            ":m": "ORDER",
        };

        if (fromDate && toDate) {
            filter = "createdAt BETWEEN :from AND :to";
            values[":from"] = fromDate;
            values[":to"] = toDate;
        }

        const res = await ddb.send(
            new QueryCommand({
                TableName: TABLE,
                IndexName: "status-meta-index",
                KeyConditionExpression: "#status = :s AND #meta = :m",
                FilterExpression: filter || undefined,
                ExpressionAttributeNames: {
                    "#status": "status",
                    "#meta": "meta",
                },
                ExpressionAttributeValues: values,
                ScanIndexForward: false,
                Limit: limit,
                ExclusiveStartKey: cursor,
            })
        );

        return {
            items: res.Items || [],
            nextCursor: res.LastEvaluatedKey || null,
        };
    }

    async getOrderById(orderId: string) {
        const res = await ddb.send(
            new QueryCommand({
                TableName: TABLE,
                IndexName: "meta-createdAt-index",
                KeyConditionExpression: "#meta = :m",
                FilterExpression: "orderId = :oid",
                ExpressionAttributeNames: {
                    "#meta": "meta",
                },
                ExpressionAttributeValues: {
                    ":m": "ORDER",
                    ":oid": orderId,
                },
                Limit: 1,
            })
        );

        return res.Items?.[0] || null;
    }
}