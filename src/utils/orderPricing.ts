export interface OrderPricingItem {
    price: number;
    quantity: number;
    isComboPackage?: boolean;
}

export interface OrderPricingBreakdown {
    subtotal: number;
    normalAmount: number;
    comboAmount: number;
    eligibleChargeAmount: number;
    hasNormalItems: boolean;
    hasComboItems: boolean;
}

export function calculateOrderPricingBreakdown(
    items: OrderPricingItem[]
): OrderPricingBreakdown {

    let subtotal = 0;
    let normalAmount = 0;
    let comboAmount = 0;

    for (const item of items) {

        const lineTotal = item.price * item.quantity;
        subtotal += lineTotal;
        if (item.isComboPackage) {
            comboAmount += lineTotal;
        } else {
            normalAmount += lineTotal;
        }
    }

    return {
        subtotal,
        normalAmount,
        comboAmount,
        eligibleChargeAmount: normalAmount,
        hasNormalItems: normalAmount > 0,
        hasComboItems: comboAmount > 0,
    };
}