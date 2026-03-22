export function applyDiscount(product: any, discounts: any[]) {
    let applied = null;

    applied =
        discounts.find(
            (d) =>
                d.discountType === "PRODUCT" &&
                d.targetId === product.productId
        ) ||
        discounts.find(
            (d) =>
                d.discountType === "CATEGORY" &&
                d.targetId === product.categoryId
        ) ||
        discounts.find(
            (d) =>
                d.discountType === "BRAND" &&
                d.targetId === product.brandId
        );

    if (!applied) {
        return {
            price: product.price,
            originalPrice: null,
            discountText: null,
        };
    }

    let finalPrice = product.price;

    if (applied.discountMode === "PERCENT") {
        finalPrice = Math.round(
            product.price -
            (product.price * applied.discountValue) / 100
        );
    }

    if (applied.discountMode === "FLAT") {
        finalPrice = product.price - applied.discountValue;
    }

    return {
        price: finalPrice,
        originalPrice: product.price,
        discountText:
            applied.discountMode === "PERCENT"
                ? `${applied.discountValue}% OFF`
                : `₹${applied.discountValue} OFF`,
    };
}