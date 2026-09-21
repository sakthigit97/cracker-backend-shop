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
                body: JSON.stringify({
                    message: "orderId required",
                }),
            };
        }

        const updated = await service.revertChitBalance({
            orderId,
            adminId: userId,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message:
                    "Chit balance reverted successfully",
                order: updated,
            }),
        };
    } catch (err: any) {
        console.error(
            "Admin revert chit balance error",
            err
        );

        return {
            statusCode: err?.statusCode || 500,
            body: JSON.stringify({
                message:
                    err?.message ||
                    "Internal Server Error",
            }),
        };
    }
};