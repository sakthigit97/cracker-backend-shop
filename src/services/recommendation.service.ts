import { RecommendationRepository } from "../repo/recommendation.repo";
import { RecommendationIntent } from "../types/recommendation.types";

const MIN_AI_BUDGET = 3000;
const MAX_AI_BUDGET = 50000;
const MIN_MATCH_PERCENTAGE = 50;

export class RecommendationService {

    constructor(
        private repo = new RecommendationRepository()
    ) { }

    async getRecommendations(
        intent: RecommendationIntent
    ) {

        if (!intent.budget) {
            return {
                status: "NEEDS_BUDGET",
                message: "Please provide your budget."
            };
        }

        if (intent.budget < MIN_AI_BUDGET) {
            return {
                status: "INVALID_BUDGET",
                message: `Minimum budget is ₹${MIN_AI_BUDGET}`
            };
        }

        const budget = Math.min(
            intent.budget,
            MAX_AI_BUDGET
        ); if (!intent.tags?.length) {
            return {
                status: "SUCCESS",
                budget,
                exactMatchFound: false,
                candidates: []
            };
        }

        const requestedTags = intent.tags.map(
            tag => tag.toLowerCase().trim()
        );

        const products = await this.repo.getAllActiveProducts();
        console.log(
            "AI PRODUCTS FROM DB",
            products.length
        );
        const availableProducts = products.filter(
            (p: any) =>
                p?.productId &&
                Number(p.price || 0) > 0 &&
                Number(p.quantity || 0) > 0
        );

        console.log(
            "AI AVAILABLE PRODUCTS",
            availableProducts.length
        );

        if (!intent.tags?.length) {
            return {
                status: "SUCCESS",
                budget,
                exactMatchFound: false,
                candidates: []
            };
        }

        const matchedProducts = availableProducts
            .map(product => {
                const tags = Array.isArray(product.aiTags) ? product.aiTags.map(
                    (tag: string) => tag.toLowerCase().trim()
                ) : [];

                const matchedTagCount = requestedTags.filter(
                    tag => tags.includes(tag)
                ).length;

                const matchPercentage = (matchedTagCount / requestedTags.length) * 100;
                return {
                    product,
                    tags,
                    matchedTagCount,
                    matchPercentage,
                };
            }).filter(item => item.matchPercentage >= MIN_MATCH_PERCENTAGE);

        console.log(
            "AI MATCHED PRODUCTS",
            matchedProducts.length
        );

        if (matchedProducts.length) {
            console.log(
                "AI FIRST MATCH",
                JSON.stringify(
                    matchedProducts[0]
                )
            );
        }

        const candidates =
            matchedProducts.map(
                (item: any) => {

                    const product = item.product;
                    const matchingTagCount = item.matchedTagCount;
                    let score = 0;
                    score += matchingTagCount * 20;

                    if (
                        matchingTagCount === requestedTags.length
                    ) {
                        score += 100;
                    }

                    const stock = Number(product.quantity || 0);
                    if (stock > 100) {
                        score += 5;
                    } else if (stock > 50) {
                        score += 3;
                    } else if (stock > 10) {
                        score += 1;
                    }

                    return {
                        productId: product.productId,
                        categoryId: product.categoryId,
                        price: Number(product.price),
                        quantity: Number(product.quantity),
                        score
                    };
                }
            );

        console.log(
            "AI CANDIDATES",
            candidates.length
        );

        console.log(
            "AI TOP CANDIDATES",
            JSON.stringify(
                candidates.slice(0, 5)
            )
        );

        candidates.sort(
            (a, b) => b.score - a.score
        );

        return {
            status: "SUCCESS",
            budget,
            exactMatchFound: candidates.length > 0,
            candidates
        };
    }
}