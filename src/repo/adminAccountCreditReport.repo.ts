import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.ORDERS_TABLE!;

const STATUS_VALUES = [
    "PAYMENT_CONFIRMED",
    "ORDER_PACKED",
    "DISPATCHED",
];

export interface AccountCreditReportFilters {
    fromDate: number;
    toDate: number;
    paymentAccountId?: string;
}

export class AdminAccountCreditReportRepository {
    async getAccountCreditReport(
        filters: AccountCreditReportFilters
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

        for (const status of STATUS_VALUES) {
            let lastEvaluatedKey: Record<
                string,
                any
            > | undefined = undefined;

            do {
                const result: any =
                    await ddb.send(
                        new QueryCommand({
                            TableName: TABLE,
                            IndexName:
                                "status-createdAt-index",

                            KeyConditionExpression:
                                "#status = :status AND #createdAt BETWEEN :fromDate AND :toDate",

                            ExpressionAttributeNames: {
                                "#status": "status",
                                "#createdAt": "createdAt",
                            },

                            ExpressionAttributeValues: {
                                ":status": status,
                                ":fromDate": fromDate,
                                ":toDate": toDate,
                            },

                            ExclusiveStartKey:
                                lastEvaluatedKey,
                        })
                    );

                const items =
                    result.Items ?? [];

                for (const order of items) {
  
                    if (
                        !order.paymentAccountId
                    ) {
                        continue;
                    }
                    
                    if (
                        paymentAccountId &&
                        order.paymentAccountId !==
                        paymentAccountId
                    ) {
                        continue;
                    }

                    const account =
                        String(
                            order.paymentAccountId
                        );

                    const amount = Number(
                        order.finalPayable ?? 0
                    );

                    if (
                        !accountSummary[account]
                    ) {
                        accountSummary[account] = {
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
                        createdAt:
                            order.createdAt,
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
        }

        const accounts = Object.values(
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
                orderCount: totalOrders,
                totalAmount,
                accountCount:
                    accounts.length,
            },
        };
    }
}