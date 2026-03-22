import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.ORDERS_TABLE!;
export class AdminOrdersRepository {

    async getOrdersByStatus({
        status,
        limit,
        cursor,
        fromDate,
        toDate,
        orderId,
    }: {
        status: string;
        limit: number;
        cursor?: any;
        fromDate?: number;
        toDate?: number;
        orderId?: string;
    }) {
        let items: any[] = [];
        let lastKey = cursor;

        do {
            const values: any = {
                ":s": status,
                ":m": "ORDER",
            };

            let filterParts: string[] = [];
            if (fromDate && toDate) {
                filterParts.push("createdAt BETWEEN :from AND :to");
                values[":from"] = fromDate;
                values[":to"] = toDate;
            }

            if (orderId) {
                filterParts.push("contains(orderId, :oid)");
                values[":oid"] = orderId;
            }

            const res = await ddb.send(
                new QueryCommand({
                    TableName: TABLE,
                    IndexName: "status-meta-index",
                    KeyConditionExpression: "#status = :s AND #meta = :m",
                    FilterExpression:
                        filterParts.length > 0
                            ? filterParts.join(" AND ")
                            : undefined,
                    ExpressionAttributeNames: {
                        "#status": "status",
                        "#meta": "meta",
                    },
                    ExpressionAttributeValues: values,
                    ScanIndexForward: false,
                    Limit: 25,
                    ExclusiveStartKey: lastKey,
                })
            );

            const fetched = res.Items || [];
            items.push(...fetched);

            lastKey = res.LastEvaluatedKey;

        } while (items.length < limit && lastKey);

        return {
            items: items.slice(0, limit),
            nextCursor: lastKey || null,
        };
    }

    async getOrderById(orderId: string) {
        const res = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: {
                    orderId,
                    meta: "ORDER",
                },
            })
        );

        return res.Item || null;
    }
}