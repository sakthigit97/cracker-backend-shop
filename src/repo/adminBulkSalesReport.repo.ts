import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.BULK_ORDERS_TABLE!;

const SALES_STATUSES = [
    "DISPATCHED",
];

export interface BulkSalesReportFilters {
    fromDate: number;
    toDate: number;
}

export class AdminBulkSalesReportRepository {
    async getSalesReport(
        filters: BulkSalesReportFilters
    ) {
        const {
            fromDate,
            toDate,
        } = filters;

        const orders: any[] = [];
        const dailySummary: Record<
            string,
            {
                date: string;
                orderCount: number;
                totalAmount: number;
            }
        > = {};

        let lastEvaluatedKey:
            Record<string, any> | undefined =
            undefined;

        do {
            const result: any =
                await ddb.send(
                    new ScanCommand({
                        TableName: TABLE,
                        ExclusiveStartKey:
                            lastEvaluatedKey,
                    })
                );

            const items =
                result.Items ?? [];

            for (const order of items) {
                if (
                    !SALES_STATUSES.includes(
                        order.status
                    )
                ) {
                    continue;
                }

                const createdAt =
                    Number(
                        order.createdAt ?? 0
                    );

                if (
                    !Number.isFinite(
                        createdAt
                    )
                ) {
                    continue;
                }

                if (
                    createdAt < fromDate ||
                    createdAt > toDate
                ) {
                    continue;
                }

                const amount =
                    Number(
                        order.pricing
                            ?.grandTotal ?? 0
                    );

                if (
                    !Number.isFinite(
                        amount
                    )
                ) {
                    continue;
                }

                const date =
                    new Date(
                        createdAt
                    ).toLocaleDateString(
                        "en-CA"
                    );

                if (
                    !dailySummary[date]
                ) {
                    dailySummary[date] = {
                        date,
                        orderCount: 0,
                        totalAmount: 0,
                    };
                }

                dailySummary[
                    date
                ].orderCount += 1;

                dailySummary[
                    date
                ].totalAmount += amount;

                orders.push({
                    orderId:
                        order.orderId,

                    createdAt,

                    status:
                        order.status,

                    amount,
                });
            }

            lastEvaluatedKey =
                result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        const dailySales =
            Object.values(
                dailySummary
            ).sort((a, b) =>
                a.date.localeCompare(
                    b.date
                )
            );

        const totalOrders =
            orders.length;

        const totalSales =
            orders.reduce(
                (sum, order) =>
                    sum +
                    Number(
                        order.amount || 0
                    ),
                0
            );

        const averageOrderValue =
            totalOrders > 0
                ? totalSales /
                totalOrders
                : 0;

        return {
            summary: {
                totalOrders,
                totalSales,
                averageOrderValue,
            },

            dailySales,

            orders,
        };
    }
}