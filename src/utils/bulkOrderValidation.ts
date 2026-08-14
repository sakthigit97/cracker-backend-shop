import {
    BulkOrderAddress,
    CreateBulkOrderRequest,
} from "../types/bulkOrder";

export class BulkOrderValidation {

    static validateCreateRequest(
        request: CreateBulkOrderRequest
    ): void {

        if (!request) {
            throw new Error(
                "Request body is required."
            );
        }

        this.validateScheme(
            request.schemeId
        );

        this.validateAddress(
            request.address
        );

        this.validateItems(
            request.items
        );

        this.validateRemarks(
            request.remarks
        );
    }

    static validateScheme(
        schemeId?: string
    ): void {

        if (
            !schemeId ||
            !schemeId.trim()
        ) {
            throw new Error(
                "Bulk scheme is required."
            );
        }

        if (
            schemeId.trim().length > 100
        ) {
            throw new Error(
                "Invalid bulk scheme."
            );
        }
    }

    static validateAddress(
        address?: BulkOrderAddress
    ): void {

        if (!address) {
            throw new Error(
                "Delivery address is required."
            );
        }

        /*
         * Full Name
         */
        const fullName =
            address.fullName?.trim() ?? "";

        if (!fullName) {
            throw new Error(
                "Full name is required."
            );
        }

        if (fullName.length < 3) {
            throw new Error(
                "Please enter a valid full name."
            );
        }

        if (fullName.length > 100) {
            throw new Error(
                "Full name cannot exceed 100 characters."
            );
        }

        /*
         * Mobile
         */
        const mobile =
            address.mobile?.trim() ?? "";

        if (!mobile) {
            throw new Error(
                "Mobile number is required."
            );
        }

        if (
            !/^[6-9]\d{9}$/.test(
                mobile
            )
        ) {
            throw new Error(
                "Please enter a valid mobile number."
            );
        }

        /*
         * Email
         */
        const email =
            address.email?.trim() ?? "";

        if (email) {

            if (
                email.length > 150
            ) {
                throw new Error(
                    "Email cannot exceed 150 characters."
                );
            }

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    email
                )
            ) {
                throw new Error(
                    "Please enter a valid email address."
                );
            }
        }

        /*
         * Address Line 1
         */
        const addressLine1 =
            address.addressLine1?.trim() ??
            "";

        if (!addressLine1) {
            throw new Error(
                "Address Line 1 is required."
            );
        }

        if (
            addressLine1.length < 5
        ) {
            throw new Error(
                "Please enter a valid address."
            );
        }

        if (
            addressLine1.length > 250
        ) {
            throw new Error(
                "Address Line 1 cannot exceed 250 characters."
            );
        }

        /*
         * Address Line 2
         */
        const addressLine2 =
            address.addressLine2?.trim() ??
            "";

        if (
            addressLine2.length > 250
        ) {
            throw new Error(
                "Address Line 2 cannot exceed 250 characters."
            );
        }

        /*
         * City
         */
        const city =
            address.city?.trim() ?? "";

        if (!city) {
            throw new Error(
                "City is required."
            );
        }

        if (city.length > 100) {
            throw new Error(
                "City cannot exceed 100 characters."
            );
        }

        /*
         * State
         */
        const state =
            address.state?.trim() ?? "";

        if (!state) {
            throw new Error(
                "State is required."
            );
        }

        if (state.length > 100) {
            throw new Error(
                "State cannot exceed 100 characters."
            );
        }

        /*
         * Pincode
         */
        const pincode =
            address.pincode?.trim() ?? "";

        if (!pincode) {
            throw new Error(
                "Pincode is required."
            );
        }

        if (
            !/^\d{6}$/.test(
                pincode
            )
        ) {
            throw new Error(
                "Please enter a valid pincode."
            );
        }
    }

    static validateItems(
        items?: {
            productId: string;
            quantity: number;
        }[]
    ): void {

        if (!Array.isArray(items)) {
            throw new Error(
                "Products are required."
            );
        }

        if (items.length === 0) {
            throw new Error(
                "Please add at least one product."
            );
        }

        /*
         * Prevent unexpectedly large requests.
         */
        if (items.length > 100) {
            throw new Error(
                "You can select a maximum of 100 products per bulk order."
            );
        }

        const productIds =
            new Set<string>();

        for (const item of items) {

            const productId =
                item?.productId?.trim() ??
                "";

            if (!productId) {
                throw new Error(
                    "Invalid product."
                );
            }

            if (
                productId.length > 100
            ) {
                throw new Error(
                    "Invalid product."
                );
            }

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

            /*
             * Prevent unrealistic quantities
             * from reaching pricing/database logic.
             */
            if (
                item.quantity > 100000
            ) {
                throw new Error(
                    `Invalid quantity for product ${productId}.`
                );
            }
        }
    }

    static validateRemarks(
        remarks?: string
    ): void {

        if (
            remarks === undefined ||
            remarks === null
        ) {
            return;
        }

        const value =
            remarks.trim();

        if (
            value.length > 500
        ) {
            throw new Error(
                "Remarks cannot exceed 500 characters."
            );
        }
    }

    static validateAdjustRequest(
        request: {
            orderId?: string;
            items?: {
                productId: string;
                quantity: number;
                cartonQty?: number;
            }[];
        },
        isAdmin: boolean
    ): void {

        if (!request) {
            throw new Error(
                "Request body is required."
            );
        }

        /*
         * Order ID
         */
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

        /*
         * Products
         */
        const items =
            request.items;

        if (!Array.isArray(items)) {
            throw new Error(
                "Products are required."
            );
        }

        if (items.length === 0) {
            throw new Error(
                "Please add at least one product."
            );
        }
        
        if (items.length > 100) {
            throw new Error(
                "You can select a maximum of 100 products per bulk order."
            );
        }

        const productIds =
            new Set<string>();

        for (const item of items) {

            const productId =
                item?.productId?.trim() ?? "";

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

            if (productIds.has(productId)) {
                throw new Error(
                    "Duplicate products are not allowed."
                );
            }

            productIds.add(productId);

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

            if (item.cartonQty !== undefined) {

                if (!isAdmin) {
                    throw new Error(
                        "Only admin can modify carton quantity."
                    );
                }

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
        }
    }
}