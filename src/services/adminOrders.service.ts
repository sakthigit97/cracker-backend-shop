import { AdminOrdersRepository } from "../repo/adminOrders.repo";

export class AdminOrdersService {
    constructor(private repo = new AdminOrdersRepository()) { }

    async listOrders(input: {
        status: string;
        limit: number;
        cursor?: any;
        fromDate?: number;
        toDate?: number;
        orderId?: string;
    }) {
        const search = input.orderId?.trim();
        if (search && search.length > 15) {
            const order = await this.repo.getOrderById(search);

            return {
                items: order ? [order] : [],
                nextCursor: null,
            };
        }

        return this.repo.getOrdersByStatus({
            status: input.status,
            limit: input.limit,
            cursor: input.cursor,
            fromDate: input.fromDate,
            toDate: input.toDate,
            orderId: search,
        });
    }
}