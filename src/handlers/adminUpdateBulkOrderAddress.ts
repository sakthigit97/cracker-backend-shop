import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";

const service = new BulkOrderService();

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
                body: JSON.stringify({
                    message: "Order ID is required.",
                }),
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Request body is required.",
                }),
            };
        }

        const payload = JSON.parse(event.body);

        const result = await service.updateAddress(
            orderId,
            payload.address,
            userId
        );

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(result),
        };
    } catch (err: any) {
        console.error(
            "AdminUpdateBulkOrderAddress error",
            err
        );

        const message = err?.message || "Internal Server Error";
        if (
            message === "Bulk order not found."
        ) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message }),
            };
        }

        if (
            message.includes("cannot be updated") ||
            message.includes("required")
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error",
            }),
        };
    }
};