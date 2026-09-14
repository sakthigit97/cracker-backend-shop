import {
    DynamoDBClient,
    ScanCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});

const ORDERS_TABLE =
    process.env.ORDERS_TABLE!;

const VALID_STATUSES = new Set([
    "PAYMENT_CONFIRMED",
    "ORDER_PACKED",
    "DISPATCHED",
]);

const DAY_MS =
    24 * 60 * 60 * 1000;

export class RevenueService {
    async getRevenueReport(params: {
        range?: string;
        fromDate?: string;
        toDate?: string;
    }) {
        const {
            range,
            fromDate,
            toDate,
        } = params;

        let currentFromTime: number;
        let currentToTime: number;

        if (fromDate && toDate) {
            const from = this.parseDate(
                fromDate,
                "fromDate"
            );

            const to = this.parseDate(
                toDate,
                "toDate"
            );

            if (from > to) {
                throw new Error(
                    "fromDate cannot be greater than toDate"
                );
            }

            currentFromTime =
                this.startOfDay(from).getTime();

            currentToTime =
                this.endOfDay(to).getTime();
        } else {
            const days =
                this.getDays(range || "7d");

            const today =
                new Date();

            const todayStart =
                this.startOfDay(today);

            const currentFrom =
                new Date(todayStart);

            currentFrom.setDate(
                currentFrom.getDate() -
                (days - 1)
            );

            currentFromTime =
                currentFrom.getTime();

            currentToTime =
                this.endOfDay(today).getTime();
        }

        const currentStartDate =
            new Date(currentFromTime);

        const currentEndDate =
            new Date(currentToTime);

        const periodDays =
            this.getInclusiveDayCount(
                currentStartDate,
                currentEndDate
            );

        const previousEndDate =
            new Date(currentStartDate);

        previousEndDate.setDate(
            previousEndDate.getDate() - 1
        );

        const previousStartDate =
            new Date(previousEndDate);

        previousStartDate.setDate(
            previousStartDate.getDate() -
            (periodDays - 1)
        );

        const previousFromTime =
            this.startOfDay(
                previousStartDate
            ).getTime();

        const previousToTime =
            this.endOfDay(
                previousEndDate
            ).getTime();

        let lastEvaluatedKey:
            Record<string, any> | undefined =
            undefined;

        let totalRevenue = 0;
        let totalOrders = 0;

        let previousRevenue = 0;

        const trendMap: Record<
            string,
            number
        > = {};

        do {
            const result: any =
                await client.send(
                    new ScanCommand({
                        TableName:
                            ORDERS_TABLE,

                        ExclusiveStartKey:
                            lastEvaluatedKey,
                    })
                );

            const items =
                result.Items || [];

            for (const item of items) {
                const status =
                    item.status?.S;

                if (
                    !VALID_STATUSES.has(
                        status || ""
                    )
                ) {
                    continue;
                }

                const createdAt =
                    Number(
                        item.createdAt?.N || 0
                    );

                if (!createdAt) {
                    continue;
                }

                const amount =
                    Number(
                        item.finalPayable?.N ||
                        0
                    ) > 0
                        ? Number(
                            item.finalPayable
                                ?.N || 0
                        )
                        : Number(
                            item.grandTotal
                                ?.N || 0
                        );

                if (
                    createdAt >=
                    currentFromTime &&
                    createdAt <=
                    currentToTime
                ) {
                    totalRevenue += amount;
                    totalOrders += 1;

                    const date =
                        new Date(
                            createdAt
                        )
                            .toISOString()
                            .split("T")[0];

                    trendMap[date] =
                        (trendMap[date] || 0) +
                        amount;
                }


                if (
                    createdAt >=
                    previousFromTime &&
                    createdAt <=
                    previousToTime
                ) {
                    previousRevenue +=
                        amount;
                }
            }

            lastEvaluatedKey =
                result.LastEvaluatedKey;
        } while (lastEvaluatedKey);


        const trend = Object.entries(
            trendMap
        )
            .map(
                ([
                    date,
                    revenue,
                ]) => ({
                    date,
                    revenue,
                })
            )
            .sort(
                (a, b) =>
                    a.date.localeCompare(
                        b.date
                    )
            );

        const avgOrderValue =
            totalOrders > 0
                ? Math.round(
                    totalRevenue /
                    totalOrders
                )
                : 0;

        let growth = 0;
        if (previousRevenue > 0) {
            growth =
                ((totalRevenue -
                    previousRevenue) /
                    previousRevenue) *
                100;
        } else if (
            totalRevenue > 0
        ) {
            growth = 100;
        }

        return {
            totalRevenue,
            totalOrders,
            avgOrderValue,
            todayRevenue:
                totalRevenue,

            yesterdayRevenue:
                previousRevenue,

            growth,

            trend,
        };
    }

    getDays(range: string) {
        if (range === "1d") {
            return 1;
        }

        if (range === "7d") {
            return 7;
        }

        if (range === "30d") {
            return 30;
        }

        return 7;
    }

    private parseDate(
        value: string,
        fieldName: string
    ) {
        const match =
            /^\d{4}-\d{2}-\d{2}$/.test(
                value
            );

        if (!match) {
            throw new Error(
                `${fieldName} must be in YYYY-MM-DD format`
            );
        }

        const date =
            new Date(
                `${value}T00:00:00`
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            throw new Error(
                `Invalid ${fieldName}`
            );
        }

        return date;
    }

    private startOfDay(
        date: Date
    ) {
        const result =
            new Date(date);

        result.setHours(
            0,
            0,
            0,
            0
        );

        return result;
    }


    private endOfDay(
        date: Date
    ) {
        const result =
            new Date(date);

        result.setHours(
            23,
            59,
            59,
            999
        );

        return result;
    }

    private getInclusiveDayCount(
        from: Date,
        to: Date
    ) {
        const fromDay =
            this.startOfDay(from);

        const toDay =
            this.startOfDay(to);

        return (
            Math.floor(
                (toDay.getTime() -
                    fromDay.getTime()) /
                DAY_MS
            ) + 1
        );
    }
}