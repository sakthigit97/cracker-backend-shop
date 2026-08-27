import {
    BulkOrderDiscountRequest,
} from "../types/bulkOrder";

export class BulkOrderDiscountValidation {

    static validateRequest(
        request: BulkOrderDiscountRequest
    ): void {

        if (!request) {
            throw new Error(
                "Request body is required."
            );
        }

        const orderId =
            request.orderId?.trim() ?? "";

        if (!orderId) {
            throw new Error(
                "Order ID is required."
            );
        }

        if (orderId.length > 100) {
            throw new Error(
                "Invalid order ID."
            );
        }

        if (
            request.discountType !== "FLAT" &&
            request.discountType !== "PERCENTAGE"
        ) {
            throw new Error(
                "Invalid discount type."
            );
        }

        if (
            !Number.isFinite(
                request.discountValue
            ) ||
            request.discountValue < 0
        ) {
            throw new Error(
                "Invalid discount value."
            );
        }

        if (
            request.discountType === "PERCENTAGE" &&
            request.discountValue > 100
        ) {
            throw new Error(
                "Percentage discount cannot exceed 100%."
            );
        }

        if (
            request.discountType === "FLAT" &&
            request.discountValue > 100000000
        ) {
            throw new Error(
                "Invalid discount value."
            );
        }
    }
}