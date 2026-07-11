import {
    PackageItem,
    RecommendationCandidate,
} from "../types/aiRecommendation.types";

const DEFAULT_LIMIT = 10;

export class AdditionalRecommendationService {

    getRecommendations(

        packageItems: PackageItem[],

        remainingCandidates: RecommendationCandidate[],

        limit = DEFAULT_LIMIT

    ): string[] {

        if (
            remainingCandidates.length === 0
        ) {

            return [];

        }
        if (limit <= 0) {
            return [];
        }
        const packageIds =
            new Set(

                packageItems.map(

                    item => item.productId

                )

            );

        const recommendations: string[] = [];

        for (const candidate of remainingCandidates) {

            if (

                packageIds.has(
                    candidate.productId
                )

            ) {

                continue;

            }

            recommendations.push(
                candidate.productId
            );

            if (

                recommendations.length >=
                limit

            ) {

                break;

            }

        }
        this.logRecommendations(
            recommendations
        );

        return recommendations;

    }

    private logRecommendations(

        recommendations: string[]

    ): void {

        console.log(

            "AI ADDITIONAL RECOMMENDATIONS",

            JSON.stringify({

                count:
                    recommendations.length,

                recommendations,

            })

        );

    }

}


