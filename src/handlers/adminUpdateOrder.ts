import { verifyJwt } from "../utils/auth";
import { AdminUpdateOrderService } from "../services/adminUpdateOrder.service";

const service = new AdminUpdateOrderService();
export const handler = async (event: any) => {
    try {
        const { role, userId } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const orderId = event.pathParameters?.orderId;
        if (!orderId) {
            return { statusCode: 400, body: "orderId required" };
        }

        const body = JSON.parse(event.body || "{}");

        const updated = await service.updateOrder({
            orderId,
            status: body.status,
            adminComment: body.adminComment,
            adminId: userId,
        });

        return {
            statusCode: 200,
            body: JSON.stringify(updated),
        };
    } catch (err: any) {
        console.error("Admin update order error", err);
        return {
            statusCode: err.statusCode || 500,
            body: err.message || "Internal Server Error",
        };
    }
};
