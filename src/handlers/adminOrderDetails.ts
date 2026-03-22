import { verifyJwt } from "../utils/auth";
import { AdminOrderDetailsService } from "../services/adminOrderDetails.service";

const service = new AdminOrderDetailsService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const orderId = event.pathParameters?.orderId;
        if (!orderId) {
            return { statusCode: 400, body: "orderId is required" };
        }

        const data = await service.getOrderDetails(orderId);
        if (!data) {
            return { statusCode: 404, body: "Order not found" };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error("AdminOrderDetails error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};
