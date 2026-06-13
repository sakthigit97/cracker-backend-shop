import { RegexIntentParser } from "../parsers/regexIntentParser";
import { RecommendationService } from "./recommendation.service";
import { PackageBuilderService } from "./packageBuilder.service";
import { ProductService } from "./product.service";
import { PopularProductsService } from "./popularProducts.service";

export class AiRecommendationOrchestratorService {

    constructor(
        private parser = new RegexIntentParser(),
        private recommendationService = new RecommendationService(),
        private packageBuilder = new PackageBuilderService(),
        private productService = new ProductService(),
        private popularProductsService = new PopularProductsService()
    ) { }

    async recommend(query: string) {

        const intent = await this.parser.parse(query);
        console.log(
            "AI INTENT",
            JSON.stringify(intent)
        );

        if (intent.missingFields.includes("budget")) {
            return {
                status: "NEEDS_BUDGET",
                message: "Please provide your budget so I can build a suitable cracker package.",
                extractedIntent: intent,
                quickBudgets: [
                    3000,
                    5000,
                    10000,
                    20000,
                    50000,
                ],
            };
        }

        const recommendation = await this.recommendationService.getRecommendations(intent);
        console.log(
            "AI RECOMMENDATION RESULT",
            JSON.stringify(recommendation)
        );
        if (
            recommendation.status !== "SUCCESS"
        ) {
            return recommendation;
        }

        if (
            !recommendation.exactMatchFound ||
            recommendation.candidates.length === 0
        ) {

            return {
                status: "NO_MATCH_FOUND",
                message: "I couldn't find matching products for your request. Please tell me more about what you're looking for.",
                extractedIntent: intent,
                suggestedTags: [
                    "kids",
                    "family",
                    "adults",
                    "eco-friendly",
                    "safe",
                    "low-noise",
                    "medium-noise",
                    "high-noise",
                    "premium",
                    "budget",
                    "colorful",
                ],
                recommendedPackage: {
                    total: 0,
                    itemCount: 0,
                    items: [],
                },
                additionalProducts: [],
            };
        }

        const packageResult = this.packageBuilder.buildPackage(
            recommendation.budget,
            recommendation.candidates
        );
        console.log(
            "AI PACKAGE RESULT",
            JSON.stringify(packageResult)
        );

        if (
            packageResult.packageItems.length === 0
        ) {
            return {
                status: "NO_PACKAGE_FOUND",
                message: "Couldn't build a package within your budget.",
                extractedIntent: intent,
                recommendedPackage: {
                    total: 0,
                    itemCount: 0,
                    items: [],
                },
                additionalProducts: [],
            };
        }

        const packageProducts = await this.productService.batchGetProducts(
            packageResult.packageItems.map(
                p => p.productId
            )
        );
        console.log(
            "AI PACKAGE PRODUCTS",
            packageProducts.length
        );

        const qtyMap = new Map(
            packageResult.packageItems.map(
                p => [
                    p.productId,
                    p.selectedQty,
                ]
            )
        );

        const packageItems = packageProducts.map(
            (p: any) => ({
                id: p.productId,
                name: p.name,
                image: p.image ?? null,
                price: p.price,
                originalPrice: p.originalPrice,
                discountText: p.discountText,
                categoryId: p.categoryId,
                brandId: p.brandId,
                qty: qtyMap.get(p.productId) || 1,
            })
        );

        let additionalProducts: any[] = [];
        if (
            packageResult.additionalProductIds.length
        ) {

            additionalProducts = await this.productService.batchGetProducts(packageResult.additionalProductIds);
            console.log(
                "AI ADDITIONAL PRODUCTS",
                additionalProducts.length
            );
        }

        if (
            additionalProducts.length < 10
        ) {

            const { items } = await this.popularProductsService.getPopularProducts({
                limit: 10 - additionalProducts.length,
            });

            const existingIds = new Set(
                additionalProducts.map(
                    (p: any) => p.productId
                )
            );
            const packageIds = new Set(
                packageItems.map(
                    p => p.id
                )
            );
            const filtered = items.filter(
                (p: any) =>
                    !existingIds.has(
                        p.productId
                    ) &&
                    !packageIds.has(
                        p.productId
                    )
            );

            additionalProducts.push(
                ...filtered
            );
        }

        const additionalItems =
            additionalProducts.map(
                (p: any) => ({
                    id: p.productId,
                    name: p.name,
                    image: p.image ?? null,
                    price: p.price,
                    originalPrice: p.originalPrice,
                    discountText: p.discountText,
                    categoryId: p.categoryId,
                    brandId: p.brandId,
                    qty: p.qty,
                })
            );

        return {
            status: "SUCCESS",
            extractedIntent: intent,
            recommendedPackage: {
                total: packageResult.total,
                itemCount: packageResult.itemCount,
                items: packageItems,
            },
            additionalProducts: additionalItems,
        };
    }
}