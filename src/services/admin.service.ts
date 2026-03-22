import { AdminRepository } from "../repo/admin.repo";

const ALL_STATUSES = [
    "ORDER_PLACED",
    "ORDER_CONFIRMED",
    "PAYMENT_CONFIRMED",
    "ORDER_PACKED",
    "DISPATCHED",
    "CANCELLED",
];

export class AdminService {
    constructor(private repo = new AdminRepository()) { }

    async getDashboard() {
        const [
            todayTotal,
            statusCounts,
            recentOrders,
        ] = await Promise.all([
            this.repo.getTodayOrderCount(),
            this.repo.getStatusBreakdown(),
            this.repo.getRecentOrders(5),
        ]);

        const normalizedStatus: Record<string, number> = {};
        ALL_STATUSES.forEach((s) => {
            normalizedStatus[s] = statusCounts[s] ?? 0;
        });

        return {
            stats: {
                todayTotal,
                pending: normalizedStatus.ORDER_PLACED,
                confirmed: normalizedStatus.ORDER_CONFIRMED,
                dispatched: normalizedStatus.DISPATCHED,
            },
            statusBreakdown: normalizedStatus,
            recentOrders,
        };
    }
}