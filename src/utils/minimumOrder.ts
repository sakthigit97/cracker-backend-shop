export function isTamilNadu(state?: string): boolean {
    const normalizedState = (state ?? "")
        .trim()
        .toLowerCase();

    return (
        normalizedState.includes("tamil nadu") ||
        normalizedState.includes("pondicherry") ||
        normalizedState.includes("puducherry")
    );
}

export function validateMinimumOrder(
    grandTotal: number,
    state: string,
    config: any
): void {
    const minimumOrderValue = isTamilNadu(state)
        ? config?.tnMinOrderValue ?? 3000
        : config?.otherStateMinOrderValue ?? 5000;

    if (grandTotal < minimumOrderValue) {
        const error: any = new Error(
            `Minimum order amount for ${state} is ₹${minimumOrderValue}. Please add more items to continue.`
        );

        error.statusCode = 400;
        throw error;
    }
}