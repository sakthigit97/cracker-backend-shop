import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";

export const handler = async (event: any) => {
    try {
        const { userId } = verifyJwt(event);

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
            body = JSON.parse(
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

        const service =
            new BulkOrderService();

        const result =
            await service.createOrder(
                userId,
                body
            );

        return {
            statusCode: 201,
            body: JSON.stringify(
                result
            ),
        };
    } catch (err: any) {
        console.error(
            "Create bulk order failed",
            err
        );

        const message =
            err?.message ||
            "Internal Server Error";

        const validationErrorMessages = [
            "Request body is required.",
            "Bulk scheme is required.",
            "Invalid bulk scheme selected.",
            "The selected bulk scheme is no longer active.",
            "Admin approval is required for the selected bulk scheme.",
            "Invalid Admin Code",
            "Admin Code has expired",
            "This Admin Code is no longer active.",
            "This Admin Code is not assigned to you",
            "This Admin Code is not valid for the selected bulk scheme.",
            "Delivery address is required.",
            "Full name is required.",
            "Please enter a valid full name.",
            "Mobile number is required.",
            "Please enter a valid mobile number.",
            "Address Line 1 is required.",
            "Please enter a valid address.",
            "City is required.",
            "State is required.",
            "Pincode is required.",
            "Please enter a valid pincode.",
            "Products are required.",
            "Please add at least one product.",
            "Invalid product.",
            "Duplicate products are not allowed.",
            "One or more selected products are unavailable.",
        ];

        const isValidationError =
            validationErrorMessages.includes(
                message
            ) ||
            message.startsWith(
                "Invalid quantity for product"
            ) ||
            message.startsWith(
                "Carton quantity is not configured"
            ) ||
            message.startsWith(
                "Bulk price is not configured"
            ) ||
            message.startsWith(
                "Minimum order amount"
            ) ||
            message.startsWith(
                "Maximum order amount"
            );

        return {
            statusCode:
                isValidationError
                    ? 400
                    : 500,
            body: JSON.stringify({
                message,
            }),
        };
    }
};