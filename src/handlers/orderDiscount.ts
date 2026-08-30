import { verifyJwt } from "../utils/auth";
import { OrderService } from "../services/order.service";

const orderService = new OrderService();

export const handler = async (event: any) => {
    try {
        const { userId, role } = verifyJwt(event);

        if (role !== "admin" && role !== "staff") {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message: "You are not authorized to apply discount",
                }),
            };
        }

        const orderId = event.pathParameters?.orderId;
        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Order ID is required",
                }),
            };
        }

        const body = JSON.parse(event.body || "{}");
        const discountType =
            typeof body.discountType === "string"
                ? body.discountType.trim().toUpperCase()
                : "FLAT";

        const discountValue = Number(body.discountValue);
        if (!["FLAT", "PERCENTAGE"].includes(discountType)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid discount type",
                }),
            };
        }

        // if (
        //     !Number.isFinite(discountValue) ||
        //     discountValue <= 0
        // ) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             message: "Discount value must be greater than 0",
        //         }),
        //     };
        // }

        if (
            discountType === "PERCENTAGE" &&
            discountValue > 100
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Percentage discount cannot exceed 100%",
                }),
            };
        }

        const order = await orderService.applyAdditionalDiscount({
            orderId,
            userId,
            role,
            discountType,
            discountValue,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Additional discount applied successfully",
                order,
            }),
        };
    } catch (err: any) {
        console.error(
            "Apply order discount failed:",
            err
        );

        const message =
            err?.message || "Failed to apply additional discount";

        let statusCode = 500;

        if (
            message === "Order not found" ||
            message === "Order ID required"
        ) {
            statusCode = 404;
        }

        if (
            message.includes("cannot") ||
            message.includes("Invalid") ||
            message.includes("authorized")
        ) {
            statusCode = 400;
        }

        return {
            statusCode,
            body: JSON.stringify({
                message,
            }),
        };
    }
};