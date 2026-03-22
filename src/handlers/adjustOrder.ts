import { verifyJwt } from "../utils/auth";
import { OrderService } from "../services/order.service";

const orderService = new OrderService();
export const handler = async (event: any) => {
    try {
        const { userId, role } = verifyJwt(event);
        const orderId = event.pathParameters?.orderId;

        const body = JSON.parse(event.body || "{}");
        const items = body.items;

        const order = await orderService.adjustOrder({
            userId,
            role,
            orderId,
            items,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ order }),
        };
    } catch (err: any) {
        console.error("Adjust order failed", err);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message || "Unable to adjust order",
            }),
        };
    }
};
