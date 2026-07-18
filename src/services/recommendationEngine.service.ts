import { RecommendationRepository } from "../repo/recommendation.repo";
import {
    AiProduct,
    AiRecommendationRequest,
    RecommendationCandidate,
} from "../types/aiRecommendation.types";

const MAX_AI_BUDGET = 50000;
const AI_WEIGHTS = {
    audience: 40,
    type: 40,
    noise: 20,
    time: 20,
    stock: 5,
    budget: 3,
};

type RelaxationLevel =
    | "STRICT"
    | "IGNORE_TIME"
    | "IGNORE_NOISE"
    | "IGNORE_TYPE";

interface RecommendationResult {
    status: string;
    budget: number;
    relaxationLevel: RelaxationLevel;
    candidates: RecommendationCandidate[];
}

export class RecommendationEngineService {

    constructor(
        private readonly repo = new RecommendationRepository()
    ) { }

    async getRecommendations(
        request: AiRecommendationRequest
    ): Promise<RecommendationResult> {

        const budget = this.normalizeBudget(request.budget);

        const normalizedRequest = this.normalizeRequest({
            ...request,
            budget,
        });

        const products =
            await this.repo.getAllActiveProducts();

        console.log(
            "AI ACTIVE PRODUCTS",
            products.length
        );

        const availableProducts =
            products.filter(
                (product): product is AiProduct =>

                    Boolean(product?.productId) &&

                    Number(product.price) > 0 &&

                    Number(product.quantity) > 0

            );
        if (!availableProducts.length) {

            return {
                status: "SUCCESS",
                budget,
                relaxationLevel: "IGNORE_TYPE",
                candidates: [],
            };

        }

        const relaxationFlow: RelaxationLevel[] = [
            "STRICT",
            "IGNORE_TIME",
            "IGNORE_NOISE",
            "IGNORE_TYPE",
        ];
        for (const level of relaxationFlow) {

            console.log(
                "AI RELAXATION LEVEL",
                level
            );

            const candidates =
                this.buildCandidates(
                    availableProducts,
                    normalizedRequest,
                    level
                );

            if (candidates.length > 0) {

                console.log(
                    "AI MATCH FOUND",
                    level,
                    candidates.length
                );

                return {
                    status: "SUCCESS",
                    budget,
                    relaxationLevel: level,
                    candidates,
                };

            }

        }
        return {
            status: "SUCCESS",
            budget,
            relaxationLevel: "IGNORE_TYPE",
            candidates: [],
        };

    }

    private buildCandidates(

        products: AiProduct[],

        request: AiRecommendationRequest,

        level: RelaxationLevel,

    ): RecommendationCandidate[] {

        const candidates: RecommendationCandidate[] = [];

        for (const product of products) {

            const candidate =
                this.scoreProduct(
                    product,
                    request,
                    level
                );

            if (candidate) {

                candidates.push(candidate);

            }

        }

        const unique =
            this.removeDuplicates(candidates);

        const sorted =
            this.sortCandidates(unique);

        this.logCandidateSummary(
            level,
            sorted
        );

        return sorted;

    }

    private normalizeRequest(
        request: AiRecommendationRequest
    ): AiRecommendationRequest {

        return {

            budget: request.budget,

            audiences:
                this.normalizeArray(
                    request.audiences
                ),

            crackerTypes:
                this.normalizeCrackerTypes(
                    request.crackerTypes
                ),

            noiseLevels:
                this.normalizeNoiseLevels(
                    request.noiseLevels
                ),

            timePreferences:
                this.normalizeTimePreferences(
                    request.timePreferences
                ),

            features: []
        };
    }

    private normalizeArray(
        values: string[] = []
    ): string[] {

        return Array.from(
            new Set(
                values
                    .filter(Boolean)
                    .map(value =>
                        value
                            .trim()
                            .toLowerCase()
                    )
            )
        );

    }

    private normalizeNoiseLevels(
        values: string[] = []
    ): string[] {

        const normalized =
            this.normalizeArray(values);

        if (!normalized.includes("both")) {
            return normalized;
        }

        return Array.from(
            new Set([
                ...normalized.filter(value => value !== "both"),
                "low",
                "high",
            ])
        );

    }
    private normalizeTimePreferences(
        values: string[] = []
    ): string[] {

        const normalized = this.normalizeArray(values);
        if (!normalized.includes("both")) {
            return normalized;
        }

        return Array.from(
            new Set([
                ...normalized.filter(value => value !== "both"),
                "day",
                "night",
            ])
        );

    }

    private normalizeCrackerTypes(
        values: string[] = []
    ): string[] {
        return this.normalizeArray(values);
    }


    private normalizeBudget(
        budget: number
    ): number {

        const normalized =
            Number(budget);

        if (
            !Number.isFinite(normalized)
        ) {

            return 0;

        }

        return Math.min(
            normalized,
            MAX_AI_BUDGET
        );

    }

    private scoreProduct(
        product: AiProduct,
        request: AiRecommendationRequest,
        level: RelaxationLevel,
    ): RecommendationCandidate | null {

        const tags = this.buildTagSet(product.aiTags);
        const audienceMatchCount =
            this.getMatchCount(
                tags,
                "audience",
                request.audiences
            );

        const matchedAudience = audienceMatchCount > 0;
        const typeMatchCount =
            this.getMatchCount(
                tags,
                "type",
                request.crackerTypes
            );

        const matchedType =
            typeMatchCount > 0;

        const noiseMatchCount =
            this.getMatchCount(
                tags,
                "noise",
                request.noiseLevels
            );

        const matchedNoise =
            noiseMatchCount > 0;

        const timeMatchCount =
            this.getMatchCount(
                tags,
                "time",
                request.timePreferences
            );

        const matchedTime =
            timeMatchCount > 0;

        if (
            !this.isEligible(
                level,
                request,
                matchedAudience,
                matchedType,
                matchedNoise,
                matchedTime
            )
        ) {
            return null;
        }

        let score = 0;
        score += this.calculateCategoryScore(
            request.audiences.length,
            audienceMatchCount,
            AI_WEIGHTS.audience
        );

        score += this.calculateCategoryScore(
            request.crackerTypes.length,
            typeMatchCount,
            AI_WEIGHTS.type
        );

        score += this.calculateCategoryScore(
            request.noiseLevels.length,
            noiseMatchCount,
            AI_WEIGHTS.noise
        );

        score += this.calculateCategoryScore(
            request.timePreferences.length,
            timeMatchCount,
            AI_WEIGHTS.time
        );

        score += this.calculateStockBonus(
            Number(product.quantity)
        );

        score += this.calculateBudgetBonus(
            request.budget,
            Number(product.price)
        );

        return {

            productId: product.productId,

            categoryId: product.categoryId,

            price: Number(product.price),

            quantity: Number(product.quantity),

            score,

            aiTags: [...tags],

            matchedAudience,

            matchedType,

            matchedNoise,

            matchedTime,

        };

    }


    private isEligible(

        level: RelaxationLevel,

        request: AiRecommendationRequest,

        matchedAudience: boolean,

        matchedType: boolean,

        matchedNoise: boolean,

        matchedTime: boolean,

    ): boolean {

        if (
            request.audiences.length &&
            !matchedAudience
        ) {
            return false;
        }

        if (
            request.crackerTypes.length &&
            !matchedType
        ) {
            return false;
        }

        if (
            level !== "IGNORE_NOISE" &&
            level !== "IGNORE_TYPE"
        ) {

            if (
                request.noiseLevels.length &&
                !matchedNoise
            ) {
                return false;
            }

        }

        if (
            level === "STRICT"
        ) {

            if (
                request.timePreferences.length &&
                !matchedTime
            ) {
                return false;
            }

        }

        return true;

    }

    async getActiveProducts(): Promise<AiProduct[]> {
        return this.repo.getAllActiveProducts();
    }

    private getMatchCount(
        tags: Set<string>,
        prefix: string,
        values: string[]
    ): number {

        if (!values.length) {
            return 0;
        }

        const matchValues = values;
        let count = 0;

        for (const value of matchValues) {

            if (tags.has(`${prefix}:${value}`)) {
                count++;
            }

        }

        return count;

    }

    private buildTagSet(
        aiTags: string[] = []
    ): Set<string> {

        return new Set(

            aiTags

                .filter(Boolean)

                .map(
                    tag =>
                        tag
                            .trim()
                            .toLowerCase()
                )

        );

    }

    private calculateStockBonus(
        quantity: number
    ): number {

        if (quantity >= 100) {
            return AI_WEIGHTS.stock;
        }

        if (quantity >= 50) {
            return Math.floor(AI_WEIGHTS.stock * 0.6);
        }

        if (quantity >= 10) {
            return Math.floor(AI_WEIGHTS.stock * 0.2);
        }

        return 0;

    }

    private calculateBudgetBonus(
        budget: number,
        productPrice: number
    ): number {

        if (
            budget <= 0 ||
            productPrice <= 0
        ) {

            return 0;

        }

        const ratio =
            productPrice / budget;

        if (
            ratio >= 0.05 &&
            ratio <= 0.20
        ) {

            return 3;

        }

        if (
            ratio > 0.20 &&
            ratio <= 0.35
        ) {

            return 2;

        }

        if (
            ratio > 0.35 &&
            ratio <= 0.50
        ) {

            return 1;

        }

        return 0;

    }

    private calculateCategoryScore(
        totalSelections: number,
        matchedSelections: number,
        weight: number
    ): number {

        if (
            totalSelections === 0 ||
            matchedSelections === 0
        ) {
            return 0;
        }

        return Math.round(
            (matchedSelections / totalSelections) * weight
        );

    }

    private logCandidateSummary(
        level: RelaxationLevel,
        candidates: RecommendationCandidate[]
    ): void {

        console.log(
            "AI ENGINE SUMMARY",
            JSON.stringify({
                level,
                totalCandidates: candidates.length,
                topCandidates: candidates
                    .slice(0, 5)
                    .map(candidate => ({
                        productId: candidate.productId,
                        score: candidate.score,
                        price: candidate.price,
                        quantity: candidate.quantity,
                    })),
            })
        );

    }

    private removeDuplicates(
        candidates: RecommendationCandidate[]
    ): RecommendationCandidate[] {

        const map = new Map<
            string,
            RecommendationCandidate
        >();

        for (const candidate of candidates) {

            const existing =
                map.get(candidate.productId);

            if (!existing) {

                map.set(
                    candidate.productId,
                    candidate
                );

                continue;

            }

            if (
                candidate.score >
                existing.score
            ) {

                map.set(
                    candidate.productId,
                    candidate
                );

            }

        }

        return Array.from(map.values());

    }

    private sortCandidates(
        candidates: RecommendationCandidate[]
    ): RecommendationCandidate[] {

        return candidates.sort(
            (a, b) => {

                if (
                    b.score !== a.score
                ) {

                    return (
                        b.score -
                        a.score
                    );

                }

                if (a.price !== b.price) {
                    return b.price - a.price;
                }

                return (
                    b.quantity -
                    a.quantity
                );

            }
        );

    }
}