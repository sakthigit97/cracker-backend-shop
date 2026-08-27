import {
    BulkOrderAdjustRequest,
    BulkOrderAdjustRequestItem,
} from "../types/bulkOrder";

export class BulkOrderAdjustValidation {

    static validateRequest(
        request: BulkOrderAdjustRequest
    ): void {

        if (!request) {
            throw new Error(
                "Request body is required."
            );
        }

        this.validateOrderId(
            request.orderId
        );

        this.validateItems(
            request.items
        );
    }


    private static validateOrderId(
        orderId?: string
    ): void {

        const value =
            orderId?.trim() ?? "";

        if (!value) {
            throw new Error(
                "Order ID is required."
            );
        }

        if (value.length > 100) {
            throw new Error(
                "Invalid order ID."
            );
        }
    }

    private static validateItems(
        items?: BulkOrderAdjustRequestItem[]
    ): void {

        if (!Array.isArray(items)) {
            throw new Error(
                "Products are required."
            );
        }

        if (items.length === 0) {
            throw new Error(
                "Please keep at least one product in the order."
            );
        }

        if (items.length > 100) {
            throw new Error(
                "You can have a maximum of 100 products per bulk order."
            );
        }

        const productIds = new Set<string>();

        for (const item of items) {

            this.validateItem(
                item
            );

            const productId =
                item.productId.trim();

            if (
                productIds.has(
                    productId
                )
            ) {
                throw new Error(
                    "Duplicate products are not allowed."
                );
            }

            productIds.add(
                productId
            );
        }
    }

    private static validateItem(
        item: BulkOrderAdjustRequestItem
    ): void {

        if (!item) {
            throw new Error(
                "Invalid product."
            );
        }

        const productId =
            item.productId?.trim() ?? "";

        if (!productId) {
            throw new Error(
                "Invalid product."
            );
        }

        if (productId.length > 100) {
            throw new Error(
                "Invalid product."
            );
        }

        if (
            !Number.isInteger(
                item.quantity
            ) ||
            item.quantity <= 0
        ) {
            throw new Error(
                `Invalid quantity for product ${productId}.`
            );
        }

        if (
            item.quantity > 100000
        ) {
            throw new Error(
                `Invalid quantity for product ${productId}.`
            );
        }

        if (
            item.cartonQty !== undefined
        ) {

            if (
                !Number.isInteger(
                    item.cartonQty
                ) ||
                item.cartonQty <= 0
            ) {
                throw new Error(
                    `Invalid carton quantity for product ${productId}.`
                );
            }

            if (
                item.cartonQty > 100000
            ) {
                throw new Error(
                    `Invalid carton quantity for product ${productId}.`
                );
            }
        }

        if (item.unitPrice !== undefined) {
            if (
                !Number.isFinite(item.unitPrice) ||
                item.unitPrice <= 0 ||
                item.unitPrice > 100000000
            ) {
                throw new Error(
                    `Invalid price for product ${productId}.`
                );
            }
        }
    }
}