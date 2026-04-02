import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});

export class ProductReportService {
    async getProductReport(params: {
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
            fromTime = now - days * 86400000;
        }

        const validStatuses = new Set([
            "PAYMENT_CONFIRMED",
            "ORDER_PACKED",
            "DISPATCHED",
        ]);

        const data = await client.send(
            new ScanCommand({ TableName: "Orders" })
        );

        const orders = data.Items || [];

        const productMap: Record<
            string,
            { productId: string; name: string; quantity: number; revenue: number }
        > = {};

        for (const order of orders) {
            const status: any = order.status?.S;
            const createdAt = Number(order.createdAt?.N);

            if (!validStatuses.has(status)) continue;
            if (!createdAt || createdAt < fromTime || createdAt > toTime) continue;

            const items = order.items?.L || [];

            for (const i of items) {
                const item = i.M;

                const productId = item?.productId?.S;
                if (!productId) continue;

                const name = item.name?.S || "Unknown";
                const quantity = Number(item.quantity?.N || 0);
                const total = Number(item.total?.N || 0);

                if (!productMap[productId]) {
                    productMap[productId] = {
                        productId,
                        name,
                        quantity: 0,
                        revenue: 0,
                    };
                }

                productMap[productId].quantity += quantity;
                productMap[productId].revenue += total;
            }
        }

        const products = Object.values(productMap);
        if (products.length === 0) {
            return {
                revenueLeaders: [],
                highDemand: [],
                underPerforming: [],
                insights: [],
            };
        }

        const byRevenue = [...products].sort((a, b) => b.revenue - a.revenue);
        const byQuantity = [...products].sort((a, b) => b.quantity - a.quantity);
        const revenueLeaders = byRevenue.slice(0, 5);
        const revenueLeaderIds = new Set(revenueLeaders.map(p => p.productId));
        const highDemand = byQuantity
            .filter(p => !revenueLeaderIds.has(p.productId))
            .slice(0, 5);

        const highDemandIds = new Set(highDemand.map(p => p.productId));

        // ⚠️ Underperforming
        const underPerforming = products.filter(
            (p) =>
                p.revenue < 500 &&
                p.quantity <= 2 &&
                !revenueLeaderIds.has(p.productId) &&
                !highDemandIds.has(p.productId)
        );

        const insights: string[] = [];

        const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);

        const top2Revenue = revenueLeaders
            .slice(0, 2)
            .reduce((sum, p) => sum + p.revenue, 0);

        if (totalRevenue > 0 && top2Revenue / totalRevenue > 0.6) {
            insights.push(
                "Top 2 products contribute more than 60% of total revenue"
            );
        }

        if (underPerforming.length >= 3) {
            insights.push(
                "Multiple products are underperforming. Consider promotions or removal"
            );
        }

        const inefficientProduct = products.find(
            (p) => p.quantity >= 5 && p.revenue < 500
        );

        if (inefficientProduct) {
            insights.push(
                `${inefficientProduct.name} has high demand but low revenue. Consider price optimization`
            );
        }

        if (
            revenueLeaders.length > 0 &&
            revenueLeaders[0].revenue > totalRevenue * 0.5
        ) {
            insights.push(
                `${revenueLeaders[0].name} contributes over 50% revenue. Risk of dependency`
            );
        }

        return {
            revenueLeaders,
            highDemand,
            underPerforming,
            insights,
        };
    }

    private getDays(range: string) {
        if (range === "7d") return 7;
        if (range === "30d") return 30;
        return 7;
    }
}