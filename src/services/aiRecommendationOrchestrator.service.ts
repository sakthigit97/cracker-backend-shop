import { AiRecommendationRequest } from "../types/aiRecommendation.types";
import { RecommendationEngineService } from "./recommendationEngine.service";
import { FallbackRecommendationService } from "./fallbackRecommendation.service";
import {
    PackageBuilderService,
    PackageBuildResult,
} from "./packageBuilder.service";
import { AdditionalRecommendationService } from "./additionalRecommendation.service";
import { ProductService } from "./product.service";
import { PopularProductsService } from "./popularProducts.service";

export class AiRecommendationOrchestratorService {

    constructor(

        private readonly fallbackRecommendationService =
            new FallbackRecommendationService(),

        private readonly recommendationEngine =
            new RecommendationEngineService(),

        private readonly packageBuilder =
            new PackageBuilderService(),

        private readonly additionalRecommendationService =
            new AdditionalRecommendationService(),

        private readonly productService =
            new ProductService(),

        private readonly popularProductsService =
            new PopularProductsService()

    ) { }

    async recommend(
        request: AiRecommendationRequest
    ) {

        const recommendationResult =
            await this.recommendationEngine.getRecommendations(
                request
            );


        let recommendationCandidates =
            recommendationResult.candidates;

        if (
            recommendationCandidates.length === 0
        ) {

            console.log(
                "AI NO MATCHES FOUND - USING FALLBACK RECOMMENDATION"
            );

            const activeProducts =
                await this.recommendationEngine.getActiveProducts();

            recommendationCandidates =
                this.fallbackRecommendationService.buildCandidates(

                    recommendationResult.budget,

                    activeProducts

                );

            console.log(

                "AI FALLBACK GENERATED",

                JSON.stringify({

                    candidates:
                        recommendationCandidates.length,

                })

            );

        }


        const packageResult: PackageBuildResult =
            this.packageBuilder.buildPackage(

                recommendationResult.budget,

                recommendationCandidates

            );

        if (
            packageResult.packageItems.length === 0
        ) {

            return {

                status: "SUCCESS",

                recommendedPackage: {

                    total: 0,

                    itemCount: 0,

                    items: [],

                },

                additionalProducts: [],

            };

        }

        const additionalProductIds =
            this.additionalRecommendationService.getRecommendations(

                packageResult.packageItems,

                packageResult.remainingCandidates,

                10

            );

        const packageProducts =
            await this.productService.batchGetProducts(

                packageResult.packageItems.map(
                    item => item.productId
                )

            );

        const packageProductMap =
            new Map(

                packageProducts.map(
                    (product: any) => [

                        product.productId,

                        product,

                    ]
                )

            );

        const packageItems =
            packageResult.packageItems

                .map(item => {

                    const product =
                        packageProductMap.get(
                            item.productId
                        );

                    if (!product) {

                        return null;

                    }

                    return {

                        id:
                            product.productId,

                        name:
                            product.name,

                        image:
                            product.image ?? null,

                        price:
                            product.price,

                        originalPrice:
                            product.originalPrice,

                        discountText:
                            product.discountText,

                        categoryId:
                            product.categoryId,

                        brandId:
                            product.brandId,

                        qty:
                            item.selectedQty,

                    };

                })

                .filter(
                    (item): item is NonNullable<typeof item> =>
                        item !== null
                );


        let additionalProducts: any[] = [];

        if (
            additionalProductIds.length > 0
        ) {

            additionalProducts =
                await this.productService.batchGetProducts(

                    additionalProductIds

                );

        }


        if (
            additionalProducts.length < 10
        ) {

            const { items } =
                await this.popularProductsService.getPopularProducts({
                    limit:
                        10 -
                        additionalProducts.length,
                });

            console.log(
                "AI POPULAR PRODUCTS",
                JSON.stringify({
                    count: items.length,
                    ids: items.map((p: any) => p.productId),
                })
            );

            const existingIds =
                new Set(

                    additionalProducts.map(
                        (product: any) =>
                            product.productId
                    )

                );

            const packageIds =
                new Set(

                    packageItems.map(
                        item => item.id
                    )

                );

            const fallbackProducts =
                items.filter(
                    (product: any) =>

                        !existingIds.has(
                            product.productId
                        ) &&

                        !packageIds.has(
                            product.productId
                        )
                );

            additionalProducts.push(
                ...fallbackProducts
            );

        }
        const additionalProductMap =
            new Map(

                additionalProducts.map(
                    (product: any) => [

                        product.productId,

                        product,

                    ]
                )

            );

        const additionalItems = [

            ...additionalProductIds,

            ...additionalProducts

                .map(
                    (product: any) =>
                        product.productId
                )

                .filter(
                    productId =>

                        !additionalProductIds.includes(
                            productId
                        )
                )

        ]

            .map(productId => {

                const product =
                    additionalProductMap.get(
                        productId
                    );

                if (!product) {

                    return null;

                }

                return {

                    id:
                        product.productId,

                    name:
                        product.name,

                    image:
                        product.image ?? null,

                    price:
                        product.price,

                    originalPrice:
                        product.originalPrice,

                    discountText:
                        product.discountText,

                    categoryId:
                        product.categoryId,

                    brandId:
                        product.brandId,

                    qty:
                        product.qty,

                };

            })

            .filter(
                (item): item is NonNullable<typeof item> =>
                    item !== null
            );

        console.log(

            "AI RECOMMENDATION COMPLETED",

            JSON.stringify({

                budget:
                    recommendationResult.budget,

                relaxationLevel:
                    recommendationResult.relaxationLevel,

                candidateCount:
                     recommendationCandidates.length,

                packageProducts:
                    packageItems.length,

                additionalProducts:
                    additionalItems.length,

                packageTotal:
                    packageResult.total,

                packageItemCount:
                    packageResult.itemCount,

            })

        );

        return {
            status: "SUCCESS",
            budget: recommendationResult.budget,
            relaxationLevel: recommendationResult.relaxationLevel,
            recommendedPackage: {
                total: packageResult.total,
                itemCount: packageResult.itemCount,
                items: packageItems,

            },
            additionalProducts: additionalItems,
        };

    }

}