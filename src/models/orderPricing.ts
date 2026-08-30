export interface PricingItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
    isComboPackage: boolean;
}

export interface PricingInput {
    items: PricingItem[];
    walletUsed: number;
    state?: string;
    config: any;
    couponResult?: {
        couponCode: string;
        couponType: "FLAT" | "PERCENTAGE";
        couponValue: number;
        couponDiscount: number;
    } | null;
    additionalDiscount?: number;
}


export interface PricingResult {

    totalProductAmount: number;

    nonComboProductTotal: number;

    comboPackageTotal: number;

    packagingCharge: number;

    amountBeforeDiscount: number;

    couponCode: string | null;

    couponType: "FLAT" | "PERCENTAGE" | null;

    couponValue: number | null;

    couponDiscount: number;

    amountAfterDiscount: number;

    gstAmount: number;

    grandTotal: number;

    walletUsed: number;

    additionalDiscount: number;

    finalPayable: number;
}