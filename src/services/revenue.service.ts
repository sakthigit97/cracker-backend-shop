import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});

export class RevenueService {
    async getRevenueReport(params: {
        range?: string;
        fromDate?: string;
        toDate?: string;
    }) {
        const { range, fromDate, toDate } = params;

        const now = Date.now();

        let fromTime: number;
        let toTime = now;

        if (fromDate && toDate) {
            fromTime = new Date(fromDate).getTime();
            toTime = new Date(toDate).getTime() + 86400000;
        } else {
            const days = this.getDays(range || "7d");
            fromTime = now - days * 24 * 60 * 60 * 1000;
        }

        const data = await client.send(
            new ScanCommand({
                TableName: "Orders",
            })
        );

        const items = data.Items || [];

        let totalRevenue = 0;
        let totalOrders = 0;

        let todayRevenue = 0;
        let yesterdayRevenue = 0;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(todayStart.getDate() - 1);

        const trendMap: Record<string, number> = {};

        const validStatuses = new Set([
            "PAYMENT_CONFIRMED",
            "ORDER_PACKED",
            "DISPATCHED",
        ]);

        items.forEach((item: any) => {
            const status = item.status?.S;
            const amount = Number(item.totalAmount?.N || 0);
            const createdAt = Number(item.createdAt?.N);

            if (!validStatuses.has(status)) return;

            if (createdAt < fromTime || createdAt > toTime) return;

            totalRevenue += amount;
            totalOrders++;

            const date = new Date(createdAt).toISOString().split("T")[0];
            trendMap[date] = (trendMap[date] || 0) + amount;

            if (createdAt >= todayStart.getTime()) {
                todayRevenue += amount;
            } else if (
                createdAt >= yesterdayStart.getTime() &&
                createdAt < todayStart.getTime()
            ) {
                yesterdayRevenue += amount;
            }
        });

        const trend = Object.entries(trendMap)
            .map(([date, revenue]) => ({
                date,
                revenue,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const avgOrderValue =
            totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        const growth =
            yesterdayRevenue > 0
                ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
                : 0;

        return {
            totalRevenue,
            totalOrders,
            avgOrderValue,
            todayRevenue,
            yesterdayRevenue,
            growth,
            trend,
        };
    }

    getDays(range: string) {
        if (range === "1d") return 1;
        if (range === "7d") return 7;
        if (range === "30d") return 30;
        return 7;
    }
}