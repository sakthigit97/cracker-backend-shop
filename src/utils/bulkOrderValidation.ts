import {
    BulkOrderAddress,
    CreateBulkOrderRequest,
} from "../types/bulkOrder";

export class BulkOrderValidation {

    static validateCreateRequest(
        request: CreateBulkOrderRequest
    ): void {

        if (!request) {
            throw new Error("Request body is required.");
        }

        this.validateScheme(request.schemeId);
        this.validateAddress(request.address);
        this.validateItems(request.items);
        this.validateRemarks(request.remarks);
    }

    static validateScheme(
        schemeId?: string
    ): void {

        if (!schemeId || !schemeId.trim()) {
            throw new Error("Bulk scheme is required.");
        }

    }

    static validateAddress(
        address?: BulkOrderAddress
    ): void {

        if (!address) {
            throw new Error("Delivery address is required.");
        }

        if (!address.fullName?.trim()) {
            throw new Error("Full name is required.");
        }

        if (address.fullName.trim().length < 3) {
            throw new Error("Please enter a valid full name.");
        }

        if (!address.mobile?.trim()) {
            throw new Error("Mobile number is required.");
        }

        if (!/^[6-9]\d{9}$/.test(address.mobile.trim())) {
            throw new Error("Please enter a valid mobile number.");
        }

        if (
            address.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                address.email.trim()
            )
        ) {
            throw new Error("Please enter a valid email address.");
        }

        if (!address.addressLine1?.trim()) {
            throw new Error("Address Line 1 is required.");
        }

        if (address.addressLine1.trim().length < 5) {
            throw new Error("Please enter a valid address.");
        }

        if (!address.city?.trim()) {
            throw new Error("City is required.");
        }

        if (!address.state?.trim()) {
            throw new Error("State is required.");
        }

        if (!address.pincode?.trim()) {
            throw new Error("Pincode is required.");
        }

        if (!/^\d{6}$/.test(address.pincode.trim())) {
            throw new Error("Please enter a valid pincode.");
        }

    }

    static validateItems(
        items?: {
            productId: string;
            quantity: number;
        }[]
    ): void {

        if (!Array.isArray(items)) {
            throw new Error("Products are required.");
        }

        if (items.length === 0) {
            throw new Error("Please add at least one product.");
        }

        const productIds = new Set<string>();

        for (const item of items) {

            if (!item.productId?.trim()) {
                throw new Error("Invalid product.");
            }

            if (productIds.has(item.productId)) {
                throw new Error(
                    "Duplicate products are not allowed."
                );
            }

            productIds.add(item.productId);

            if (
                !Number.isInteger(item.quantity) ||
                item.quantity <= 0
            ) {
                throw new Error(
                    `Invalid quantity for product ${item.productId}.`
                );
            }

        }

    }

    static validateRemarks(
        remarks?: string
    ): void {

        if (!remarks) {
            return;
        }

        if (remarks.length > 500) {
            throw new Error(
                "Remarks cannot exceed 500 characters."
            );
        }

    }
}