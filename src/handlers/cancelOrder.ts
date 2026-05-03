import { verifyJwt } from "../utils/auth";
import { OrderService } from "../services/order.service";

const service = new OrderService();
export const handler = async (event: any) => {
    try {
        const { userId } = verifyJwt(event);
        const orderId = event.pathParameters?.orderId;

        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Order ID required" }),
            };
        }

        await service.cancelOrder(orderId, userId);
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (err: any) {
        console.error("Cancel order failed", err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: err?.message || "Internal Server Error",
            })
        };
    }
};