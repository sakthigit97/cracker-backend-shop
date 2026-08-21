import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";

export const handler = async (
    event: any
) => {
    try {
        const { userId, role } =
            verifyJwt(event);

        const orderId =
            event.pathParameters
                ?.orderId?.trim() ?? "";

        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Order ID is required.",
                }),
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Request body is required.",
                }),
            };
        }

        let body: any;

        try {
            body =
                JSON.parse(
                    event.body
                );
        } catch {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Invalid request body.",
                }),
            };
        }

        const request = {
            orderId,
            items: body?.items,
        };

        const service =
            new BulkOrderService();

        let result;

        if (role === "admin" || role === "staff") {
            result =
                await service.adminAdjustOrder(
                    request
                );
        } else if (role === "user") {
            result =
                await service.adjustOrder(
                    userId,
                    request
                );
        } else {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message:
                        "You are not authorized to adjust bulk orders.",
                }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(
                result
            ),
        };
    } catch (err: any) {
        console.error(
            "Bulk order adjustment failed",
            err
        );

        const message =
            err?.message ||
            "Internal Server Error";

        const isAuthorizationError =
            message ===
                "You are not authorized to adjust this bulk order." ||
            message ===
                "You are not authorized to change carton quantity.";

        const validationErrorMessages = [
            "Request body is required.",
            "Invalid request body.",
            "Order ID is required.",
            "Invalid order ID.",
            "Products are required.",
            "Please keep at least one product in the order.",
            "You can have a maximum of 100 products per bulk order.",
            "Duplicate products are not allowed.",
            "Invalid product.",
            "This bulk order can no longer be adjusted.",
            "Bulk order not found.",
            "Admin configuration not found.",
            "The bulk scheme for this order is no longer available.",
            "The bulk scheme for this order is no longer active.",
            "Bulk schemes are not configured.",
        ];

        const isValidationError =
            validationErrorMessages.includes(
                message
            ) ||
            message.startsWith(
                "Invalid quantity for product"
            ) ||
            message.startsWith(
                "Invalid carton quantity for product"
            ) ||
            message.startsWith(
                "Product not found:"
            ) ||
            message.startsWith(
                "Carton quantity is not configured for"
            ) ||
            message.startsWith(
                "Bulk price is not configured for"
            ) ||
            message.startsWith(
                "Minimum order amount for"
            ) ||
            message.includes(
                "is not available for bulk orders"
            );

        return {
            statusCode:
                isAuthorizationError
                    ? 403
                    : isValidationError
                        ? 400
                        : 500,

            body: JSON.stringify({
                message,
            }),
        };
    }
};