import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.BULK_ORDERS_TABLE!;

const VALID_STATUSES = [
    "PAYMENT_CONFIRMED",
    "ORDER_PACKED",
    "DISPATCHED",
];

export interface BulkAccountCreditReportFilters {
    fromDate: number;
    toDate: number;
    paymentAccountId?: string;
}

export class AdminBulkAccountCreditReportRepository {
    async getAccountCreditReport(
        filters: BulkAccountCreditReportFilters
    ) {
        const {
            fromDate,
            toDate,
            paymentAccountId,
        } = filters;

        const accountSummary: Record<
            string,
            {
                paymentAccountId: string;
                orderCount: number;
                totalAmount: number;
            }
        > = {};

        const orders: any[] = [];

        let lastEvaluatedKey:
            Record<string, any> | undefined =
            undefined;

        /*
         * Bulk Orders are scanned with pagination so
         * records are not missed when DynamoDB returns
         * a partial Scan response.
         */
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
                /*
                 * Only the current order status matters.
                 */
                if (
                    !VALID_STATUSES.includes(
                        order.status
                    )
                ) {
                    continue;
                }

                /*
                 * Date range is based on order creation date.
                 */
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

                /*
                 * Every qualifying bulk order should have
                 * a payment account once payment is confirmed.
                 */
                if (
                    !order.paymentAccountId
                ) {
                    continue;
                }

                if (
                    paymentAccountId &&
                    String(
                        order.paymentAccountId
                    ) !== paymentAccountId
                ) {
                    continue;
                }

                const account =
                    String(
                        order.paymentAccountId
                    );

                /*
                 * Bulk order amount is stored inside
                 * pricing.grandTotal.
                 */
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

                if (
                    !accountSummary[
                    account
                    ]
                ) {
                    accountSummary[
                        account
                    ] = {
                        paymentAccountId:
                            account,
                        orderCount: 0,
                        totalAmount: 0,
                    };
                }

                accountSummary[
                    account
                ].orderCount += 1;

                accountSummary[
                    account
                ].totalAmount += amount;

                orders.push({
                    orderId:
                        order.orderId,

                    createdAt,

                    status:
                        order.status,

                    paymentAccountId:
                        account,

                    amount,
                });
            }

            lastEvaluatedKey =
                result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        /*
         * Highest credited account first.
         */
        const accounts =
            Object.values(
                accountSummary
            ).sort(
                (a, b) =>
                    b.totalAmount -
                    a.totalAmount
            );

        const totalOrders =
            accounts.reduce(
                (sum, account) =>
                    sum +
                    account.orderCount,
                0
            );

        const totalAmount =
            accounts.reduce(
                (sum, account) =>
                    sum +
                    account.totalAmount,
                0
            );

        return {
            accounts,

            orders,

            totals: {
                orderCount:
                    totalOrders,

                totalAmount,

                accountCount:
                    accounts.length,
            },
        };
    }
}