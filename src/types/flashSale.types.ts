export type FlashSaleStatus =
    | "SCHEDULED"
    | "ACTIVE"
    | "EXPIRED"
    | "CANCELLED";

export interface FlashSale {
    flashSaleId: string;
    productId: string;
    header: string;
    imageUrl: string;
    originalPrice: number;
    salePrice: number;
    startAt: string;
    endAt: string;
    status: FlashSaleStatus;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFlashSaleInput {
    productId: string;
    header: string;
    imageUrl: string;
    salePrice: number;
    startAt: string;
    endAt: string;
}

export interface UpdateFlashSaleInput {
    header?: string;
    imageUrl?: string;
    salePrice?: number;
    startAt?: string;
    endAt?: string;
}