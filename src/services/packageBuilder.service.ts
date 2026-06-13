const MAX_ITERATIONS = 1000;
const MAX_ADDITIONAL_PRODUCTS = 20;
const MAX_QTY_PER_PRODUCT = Number.isFinite(Number(process.env.MAX_AI_PRODUCT_QTY))
    ? Number(process.env.MAX_AI_PRODUCT_QTY) : 10;

export class PackageBuilderService {

    buildPackage(
        budget: number,
        candidates: any[]
    ) {

        if (!candidates?.length) {
            return {
                total: 0,
                itemCount: 0,
                packageItems: [],
                additionalProductIds: [],
            };
        }

        const validProducts = candidates.filter(
            (p) =>
                p?.productId &&
                Number(p.price || 0) > 0 &&
                Number(p.quantity || 0) > 0
        );
        console.log(
            "AI VALID PRODUCTS",
            validProducts.length
        );
        if (!validProducts.length) {
            return {
                total: 0,
                itemCount: 0,
                packageItems: [],
                additionalProductIds: [],
            };
        }

        const uniqueProducts = Array.from(
            new Map(
                validProducts.map(
                    (p) => [p.productId, p]
                )
            ).values()
        );
        console.log(
            "AI UNIQUE PRODUCTS",
            uniqueProducts.length
        );

        uniqueProducts.sort(
            (a, b) => b.score - a.score
        );
        const affordableProducts = uniqueProducts.filter(
            (p) => Number(p.price) <= budget
        );

        console.log(
            "AI AFFORDABLE PRODUCTS",
            affordableProducts.length
        );

        console.log(
            "AI BUDGET",
            budget
        );

        if (!affordableProducts.length) {
            return {
                total: 0,
                itemCount: 0,
                packageItems: [],
                additionalProductIds: [],
            };
        }

        const cheapestPrice = Math.min(
            ...affordableProducts.map(
                (p) => Number(p.price)
            )
        );

        if (
            !Number.isFinite(cheapestPrice) ||
            cheapestPrice <= 0
        ) {
            return {
                total: 0,
                itemCount: 0,
                packageItems: [],
                additionalProductIds: [],
            };
        }

        const packageMap = new Map<
            string,
            {
                productId: string;
                selectedQty: number;
            }
        >();

        let total = 0;
        let iterations = 0;
        let added = true;

        while (
            added &&
            iterations < MAX_ITERATIONS
        ) {

            iterations++;
            added = false;

            if (
                budget - total <
                cheapestPrice
            ) {
                break;
            }

            for (const product of affordableProducts) {

                console.log(
                    "AI ADDING PRODUCT",
                    product.productId,
                    product.price
                );
                const existing = packageMap.get(
                    product.productId
                );

                const currentQty = existing?.selectedQty || 0;

                if (
                    currentQty >=
                    Number(product.quantity)
                ) {
                    continue;
                }

                const maxAllowedQty = Math.min(
                    Number(product.quantity),
                    MAX_QTY_PER_PRODUCT
                );

                if (
                    currentQty >=
                    maxAllowedQty
                ) {
                    continue;
                }

                if (
                    total +
                    Number(product.price) >
                    budget
                ) {
                    continue;
                }

                packageMap.set(
                    product.productId,
                    {
                        productId:
                            product.productId,

                        selectedQty:
                            currentQty + 1,
                    }
                );

                total += Number(product.price);
                added = true;
            }
        }

        const packageItems = Array.from(
            packageMap.values()
        );

        const packageIds = new Set(
            packageItems.map(
                (p) => p.productId
            )
        );

        const additionalProductIds =
            uniqueProducts.filter(
                (p) =>
                    !packageIds.has(
                        p.productId
                    )
            ).sort(
                (a, b) =>
                    b.score - a.score
            ).slice(
                0,
                MAX_ADDITIONAL_PRODUCTS
            ).map(
                (p) => p.productId
            );
        console.log(
            "AI PACKAGE ITEMS",
            JSON.stringify(packageItems)
        );

        console.log(
            "AI PACKAGE TOTAL",
            total
        );

        console.log(
            "AI ADDITIONAL PRODUCTS",
            additionalProductIds.length
        );

        return {
            total,

            itemCount:
                packageItems.reduce(
                    (sum, item) =>
                        sum +
                        item.selectedQty,
                    0
                ),

            packageItems,

            additionalProductIds,
        };
    }
}