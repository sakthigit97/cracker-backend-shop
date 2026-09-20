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

        const orderId =
            event.pathParameters?.orderId;

        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "orderId required",
                }),
            };
        }

        let body: any;

        try {
            body = JSON.parse(
                event.body || "{}"
            );
        } catch {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid JSON body",
                }),
            };
        }

        const chitAmount = Number(body.chitAmount);
        if (
            !Number.isFinite(chitAmount) ||
            chitAmount <= 0
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Valid chitAmount is required",
                }),
            };
        }

        const updated = await service.applyChitBalance({
            orderId,
            chitAmount,
            adminId: userId,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message:
                    "Chit balance applied successfully",
                order: updated,
            }),
        };
    } catch (err: any) {
        console.error(
            "Admin apply chit balance error",
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