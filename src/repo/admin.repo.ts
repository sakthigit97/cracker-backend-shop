import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.ORDERS_TABLE!;

const ALL_STATUSES = [
    "ORDER_PLACED",
    "ORDER_CONFIRMED",
    "PAYMENT_CONFIRMED",
    "ORDER_PACKED",
    "DISPATCHED",
    "CANCELLED",
];

export class AdminRepository {

    async getTodayOrderCount() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const res = await ddb.send(
            new QueryCommand({
                TableName: TABLE,
                IndexName: "meta-createdAt-index",
                KeyConditionExpression:
                    "#meta = :meta AND createdAt >= :start",
                ExpressionAttributeNames: {
                    "#meta": "meta",
                },
                ExpressionAttributeValues: {
                    ":meta": "ORDER",
                    ":start": startOfDay.getTime(),
                },
                Select: "COUNT",
            })
        );

        return res.Count ?? 0;
    }

    async getStatusBreakdown() {
        const counts: Record<string, number> = {};

        await Promise.all(
            ALL_STATUSES.map(async (status) => {
                const res = await ddb.send(
                    new QueryCommand({
                        TableName: TABLE,
                        IndexName: "status-meta-index",
                        KeyConditionExpression:
                            "#status = :status AND #meta = :meta",
                        ExpressionAttributeNames: {
                            "#status": "status",
                            "#meta": "meta",
                        },
                        ExpressionAttributeValues: {
                            ":status": status,
                            ":meta": "ORDER",
                        },
                        Select: "COUNT",
                    })
                );

                counts[status] = res.Count ?? 0;
            })
        );

        return counts;
    }

    async getRecentOrders(limit: number) {
        const res = await ddb.send(
            new QueryCommand({
                TableName: TABLE,
                IndexName: "meta-createdAt-index",
                KeyConditionExpression: "#meta = :meta",
                ExpressionAttributeNames: {
                    "#meta": "meta",
                    "#status": "status",
                },
                ExpressionAttributeValues: {
                    ":meta": "ORDER",
                },
                ScanIndexForward: false,
                Limit: limit,
                ProjectionExpression:
                    "orderId, #status, totalAmount, createdAt",
            })
        );

        return res.Items ?? [];
    }
}