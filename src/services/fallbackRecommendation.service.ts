import {
    AiProduct,
    RecommendationCandidate,
} from "../types/aiRecommendation.types";

export class FallbackRecommendationService {
    buildCandidates(
        budget: number,
        products: AiProduct[]
    ): RecommendationCandidate[] {

        if (
            budget <= 0 ||
            products.length === 0
        ) {
            return [];
        }

        const candidates =

            products
                .filter(product =>

                    product.price > 0 &&

                    product.quantity > 0 &&

                    product.price <= budget

                )

                .sort((a, b) => {

                    if (
                        a.price !== b.price
                    ) {
                        return b.price - a.price;
                    }

                    if (
                        b.quantity !==
                        a.quantity
                    ) {

                        return (
                            b.quantity -
                            a.quantity
                        );

                    }

                    return a.productId.localeCompare(
                        b.productId
                    );

                })

                .map(product =>

                    this.toCandidate(
                        product,
                        budget
                    )

                );

        console.log(

            "AI FALLBACK CANDIDATES",

            JSON.stringify({

                budget,

                candidates:
                    candidates.length,

            })

        );

        return candidates;

    }

    private toCandidate(

        product: AiProduct,

        budget: number

    ): RecommendationCandidate {

        const utilization =
            product.price / budget;

        const score =

            utilization >= 0.50
                ? 5
                : utilization >= 0.30
                    ? 4
                    : utilization >= 0.15
                        ? 3
                        : utilization >= 0.05
                            ? 2
                            : 1;

        return {

            productId:
                product.productId,

            categoryId:
                product.categoryId,

            price:
                product.price,

            quantity:
                product.quantity,

            aiTags:
                product.aiTags ?? [],

            score,

            matchedAudience:
                false,

            matchedType:
                false,

            matchedNoise:
                false,

            matchedTime:
                false,

        };

    }

}