export interface BulkOrderAddress {
    fullName: string;
    mobile: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
}

export interface BulkOrderRequestItem {
    productId: string;
    quantity: number;
}

export interface CreateBulkOrderRequest {
    schemeId: string;
    adminCode?: string;
    remarks?: string;
    address: BulkOrderAddress;
    items: BulkOrderRequestItem[];
}

export interface BulkOrderItem {
    productId: string;
    name: string;
    image?: string;
    brand?: string;
    categoryId?: string;
    bulkOrderBasePrice: number;
    cartonQty: number;
    unitPrice: number;
    schemePrice: number;
    quantity: number;
    total: number;
}

export interface BulkOrderAdjustRequestItem {
    productId: string;
    quantity: number;
    cartonQty?: number;
}

export interface BulkOrderAdjustRequest {
    orderId: string;
    items: BulkOrderAdjustRequestItem[];
}

export interface BulkOrderPricing {
    productTotal: number;
    cartonBoxCount: number;
    packagingPercent: number;
    packagingCharge: number;
    gstPercent: number;
    gstAmount: number;
    grandTotal: number;
}

export interface BulkOrder {
    orderId: string;
    meta: "ORDER";
    userId: string;
    status: string;
    schemeId: string;
    remarks?: string;
    address: BulkOrderAddress;
    items: BulkOrderItem[];
    pricing: BulkOrderPricing;
    createdAt: number;
    updatedAt: number;
    statusHistory: {
        status: string;
        at: number;
        by: string;
    }[];
}