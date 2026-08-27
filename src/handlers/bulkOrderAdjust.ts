import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";


export const handler = async (
    event: any
) => {

    try {

        if (
            event.rawPath?.endsWith(
                "/discount"
            )
        ) {
            return await applyDiscount(
                event
            );
        }

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

        if (
            role === "admin" ||
            role === "staff"
        ) {

            result =
                await service.adminAdjustOrder(
                    request,
                    role,
                    userId
                );

        } else if (
            role === "user"
        ) {

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


export const applyDiscount = async (
    event: any
) => {

    try {

        const {
            userId,
            role,
        } = verifyJwt(event);

        if (
            role !== "admin" &&
            role !== "staff"
        ) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message:
                        "You are not authorized to apply discount.",
                }),
            };
        }

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

        const discountType =
            body?.discountType;

        const discountValue =
            body?.discountValue;

        if (
            discountType !== "FLAT" &&
            discountType !== "PERCENTAGE"
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Invalid discount type.",
                }),
            };
        }

        if (
            typeof discountValue !== "number" ||
            !Number.isFinite(
                discountValue
            )
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Invalid discount value.",
                }),
            };
        }

        const service =
            new BulkOrderService();

        const result =
            await service.applyDiscount(
                orderId,
                discountType,
                discountValue,
                role,
                userId
            );

        return {
            statusCode: 200,
            body: JSON.stringify(
                result
            ),
        };

    } catch (err: any) {

        console.error(
            "Bulk order discount update failed",
            err
        );

        const message =
            err?.message ||
            "Internal Server Error";

        const isAuthorizationError =
            message ===
            "You are not authorized to apply discount.";

        const isValidationError =
            message ===
            "Order ID is required." ||
            message ===
            "Request body is required." ||
            message ===
            "Invalid request body." ||
            message ===
            "Invalid discount type." ||
            message ===
            "Invalid discount value." ||
            message ===
            "Percentage discount must be between 0 and 100." ||
            message ===
            "Discount amount cannot be negative." ||
            message ===
            "Discount amount cannot exceed the product total." ||
            message ===
            "Bulk order not found." ||
            message ===
            "Admin configuration not found." ||
            message ===
            "This bulk order can no longer be adjusted." ||
            message ===
            "The bulk scheme for this order is no longer available." ||
            message ===
            "The bulk scheme for this order is no longer active.";

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