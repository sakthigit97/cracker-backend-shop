import { verifyJwt } from "../utils/auth";
import { AdminOrdersService } from "../services/adminOrders.service";

const service = new AdminOrdersService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const q = event.queryStringParameters || {};
        const data = await service.listOrders({
            status: q.status || "ORDER_PLACED",
            limit: Number(q.limit || 10),
            cursor: q.cursor ? JSON.parse(q.cursor) : undefined,
            fromDate: q.fromDate ? Number(q.fromDate) : undefined,
            toDate: q.toDate ? Number(q.toDate) : undefined,
            orderId: q.orderId,
        });

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};