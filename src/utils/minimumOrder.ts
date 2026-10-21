
export function isTamilNadu(state?: string): boolean {
    const normalizedState = (state ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    return [
        "tamil nadu",
        "pondicherry",
        "puducherry",
    ].includes(normalizedState);
}

export function validateMinimumOrder(
    grandTotal: number,
    state: string,
    config: any
): void {
    const normalizedState = (state ?? "")
        .trim()
        .toLowerCase();

    const minimumOrderValue = Number(
        isTamilNadu(normalizedState)
            ? config?.tnMinOrderValue ?? 3000
            : config?.otherStateMinOrderValue ?? 5000
    );

    const orderAmount = Number(grandTotal);

    console.log("Minimum order validation:", {
        deliveryState: state,
        normalizedState,
        orderAmount,
        minimumOrderValue,
        tnMinOrderValue: config?.tnMinOrderValue,
        otherStateMinOrderValue: config?.otherStateMinOrderValue,
        passed: orderAmount >= minimumOrderValue,
    });

    if (!Number.isFinite(orderAmount) ||
        !Number.isFinite(minimumOrderValue) ||
        orderAmount < minimumOrderValue) {
        const error: any = new Error(
            `Minimum order amount for ${state} is ₹${minimumOrderValue}. ` +
            `Current eligible order amount is ₹${orderAmount}. ` +
            `Please add more items to continue.`
        );

        error.statusCode = 400;
        throw error;
    }
}
