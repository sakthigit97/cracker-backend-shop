import { verifyJwt } from "../utils/auth";
import { AdminUpdateOrderService } from "../services/adminUpdateOrder.service";

const service = new AdminUpdateOrderService();
export const handler = async (event: any) => {
    try {
        const { role, userId } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const orderId = event.pathParameters?.orderId;

        if (!orderId) {
            return {
                statusCode: 400,
                body: "Order ID is required",
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                body: "Request body is required",
            };
        }

        const payload = JSON.parse(event.body);

        if (!payload.address) {
            return {
                statusCode: 400,
                body: "Address is required",
            };
        }

        const updatedOrder = await service.updateOrderAddress({
            orderId,
            address: payload.address,
            adminId: userId,
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedOrder),
        };
    } catch (err: any) {
        console.error("AdminUpdateOrderAddress error", err);

        if (err?.statusCode) {
            return {
                statusCode: err.statusCode,
                body: err.message,
            };
        }

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};