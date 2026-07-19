import {
    PackageItem,
    RecommendationCandidate,
} from "../types/aiRecommendation.types";

const MAX_AI_PRODUCT_QTY = Number.isFinite(
    Number(process.env.MAX_AI_PRODUCT_QTY)
)
    ? Number(process.env.MAX_AI_PRODUCT_QTY)
    : 10;

const OPTIMIZATION_POOL_SIZE = 30;
export interface PackageBuildResult {
    total: number;
    itemCount: number;
    packageItems: PackageItem[];
    remainingCandidates: RecommendationCandidate[];
}

interface WorkingPackage {
    total: number;
    score: number;
    items: Map<string, PackageItem>;
}

export class PackageBuilderService {
    buildPackage(
        budget: number,
        candidates: RecommendationCandidate[]
    ): PackageBuildResult {
        if (budget <= 0 || candidates.length === 0) {
            return this.emptyResult();
        }

        const rankedCandidates = this.prepareCandidates(budget, candidates);
        console.log("Prepared candidates:", rankedCandidates.length);

        if (rankedCandidates.length === 0) {
            return this.emptyResult();
        }

        const optimizationPool = this.buildOptimizationPool(rankedCandidates);
        console.log("Optimization pool:", optimizationPool.length);

        const workingPackage =
            this.optimizePackage(
                budget,
                optimizationPool
            );
        console.log("After optimize:", workingPackage.items.size);

        this.fillRemainingBudget(
            budget,
            rankedCandidates,
            workingPackage
        );
        console.log("After fill:", workingPackage.items.size);

        this.expandQuantities(
            budget,
            rankedCandidates,
            workingPackage
        );
        console.log("After quantity expansion:", workingPackage.items.size);

        const packageItems = [...workingPackage.items.values()];
        const selectedIds = new Set(packageItems.map((item) => item.productId));
        const remainingCandidates = rankedCandidates.filter(
            (candidate) => !selectedIds.has(candidate.productId)
        );

        this.logPackageSummary(
            budget,
            workingPackage.total,
            packageItems,
            remainingCandidates.length
        );
        console.log("Final total:", workingPackage.total);
        return {
            total: workingPackage.total,
            itemCount: packageItems.reduce((sum, item) => sum + item.selectedQty, 0),
            packageItems,
            remainingCandidates,
        };
    }

    private emptyResult(): PackageBuildResult {
        return {
            total: 0,
            itemCount: 0,
            packageItems: [],
            remainingCandidates: [],
        };
    }

    private prepareCandidates(
        budget: number,
        candidates: RecommendationCandidate[]
    ): RecommendationCandidate[] {
        const unique = new Map<string, RecommendationCandidate>();

        for (const candidate of candidates) {
            if (
                candidate.price <= 0 ||
                candidate.quantity <= 0 ||
                candidate.price > budget
            ) {
                continue;
            }

            const existing = unique.get(candidate.productId);
            if (!existing || candidate.score > existing.score) {
                unique.set(candidate.productId, candidate);
            }
        }

        return [...unique.values()].sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            if (a.price !== b.price) {
                return a.price - b.price;
            }

            return b.quantity - a.quantity;
        });
    }

    private buildOptimizationPool(
        candidates: RecommendationCandidate[]
    ): RecommendationCandidate[] {
        return candidates.slice(
            0,
            Math.min(OPTIMIZATION_POOL_SIZE, candidates.length)
        );
    }

    private optimizePackage(
        budget: number,

        candidates: RecommendationCandidate[]
    ): WorkingPackage {
        const BEAM_WIDTH = 25;

        let beam: WorkingPackage[] = [
            {
                total: 0,
                score: 0,
                items: new Map(),
            },
        ];

        for (const candidate of candidates) {
            const nextBeam: WorkingPackage[] = [...beam];

            for (const current of beam) {
                if (current.items.has(candidate.productId)) {
                    continue;
                }

                if (current.total + candidate.price > budget) {
                    continue;
                }

                const clone = this.cloneWorkingPackage(current);
                clone.items.set(
                    candidate.productId,
                    {
                        productId: candidate.productId,
                        selectedQty: 1,
                    }
                );

                clone.total += candidate.price;
                clone.score += candidate.score;
                nextBeam.push(clone);
            }

            const unique = new Map<string, WorkingPackage>();
            for (const pkg of nextBeam) {
                unique.set(
                    this.packageKey(pkg),

                    pkg
                );
            }

            beam = [...unique.values()]
                .sort(
                    (a, b) =>
                        this.packageValue(
                            b,
                            budget
                        ) -
                        this.packageValue(
                            a,
                            budget
                        )
                )
                .slice(0, BEAM_WIDTH);
        }

        const best = beam.sort(
            (a, b) => this.packageValue(b, budget) - this.packageValue(a, budget)
        )[0];

        return best;
    }

    private packageValue(
        pkg: WorkingPackage,
        budget: number
    ): number {
        const utilization = pkg.total / budget;
        return utilization * 5000 + pkg.score * 500 + pkg.items.size * 10;
    }

    private cloneWorkingPackage(pkg: WorkingPackage): WorkingPackage {
        return {
            total: pkg.total,
            score: pkg.score,
            items: new Map(
                [...pkg.items.entries()].map(([key, value]) => [
                    key,

                    {
                        ...value,
                    },
                ])
            ),
        };
    }
    private packageKey(pkg: WorkingPackage): string {
        return [...pkg.items.keys()]
            .sort()
            .join("|");
    }


    private expandQuantities(
        budget: number,
        candidates: RecommendationCandidate[],
        workingPackage: WorkingPackage
    ): void {
        while (true) {
            const remainingBudget = budget - workingPackage.total;

            if (remainingBudget <= 0) {
                break;
            }

            const candidate = this.findBestQuantityCandidate(
                remainingBudget,
                candidates,
                workingPackage
            );

            if (!candidate) {
                break;
            }

            const item = workingPackage.items.get(candidate.productId)!;
            item.selectedQty++;
            workingPackage.total += candidate.price;
            workingPackage.score += candidate.score;
        }
    }


    private findBestNewCandidate(
        remainingBudget: number,
        candidates: RecommendationCandidate[],
        workingPackage: WorkingPackage
    ): RecommendationCandidate | undefined {
        const categoryCounts = new Map<string, number>();
        const familyCounts = new Map<string, number>();

        for (const item of workingPackage.items.values()) {
            const selected = candidates.find(
                (c) => c.productId === item.productId
            );

            if (!selected) {
                continue;
            }

            categoryCounts.set(
                selected.categoryId,
                (categoryCounts.get(selected.categoryId) ?? 0) + 1
            );

            if (selected.productFamily) {
                familyCounts.set(
                    selected.productFamily,
                    (familyCounts.get(selected.productFamily) ?? 0) + 1
                );
            }
        }

        let bestCandidate: RecommendationCandidate | undefined;
        let bestScore = Number.NEGATIVE_INFINITY;
        for (const candidate of candidates) {
            if (workingPackage.items.has(candidate.productId)) {
                continue;
            }

            if (candidate.price > remainingBudget) {
                continue;
            }

            const categoryCount = categoryCounts.get(candidate.categoryId) ?? 0;
            const familyCount = candidate.productFamily
                ? familyCounts.get(candidate.productFamily) ?? 0
                : 0;

            const leftover = remainingBudget - candidate.price;
            const FAMILY_PENALTY = 8;
            const adjustedScore =
                candidate.score
                - categoryCount
                - (familyCount * FAMILY_PENALTY)
                + this.leftoverBudgetBonus(
                    leftover,
                    candidates,
                    workingPackage
                );

            if (adjustedScore > bestScore) {
                bestScore = adjustedScore;
                bestCandidate = candidate;
            }
        }

        return bestCandidate;
    }

    private leftoverBudgetBonus(
        leftover: number,
        candidates: RecommendationCandidate[],
        workingPackage: WorkingPackage
    ): number {
        if (leftover <= 0) {
            return 0;
        }

        const cheapestRemaining = candidates
            .filter(
                c =>
                    !workingPackage.items.has(c.productId)
            )
            .reduce(
                (min, c) => Math.min(min, c.price),
                Number.MAX_SAFE_INTEGER
            );

        if (cheapestRemaining === Number.MAX_SAFE_INTEGER) {
            return 0;
        }

        if (leftover >= cheapestRemaining) {
            return 3;
        }

        return -3;
    }
    private findBestQuantityCandidate(
        remainingBudget: number,
        candidates: RecommendationCandidate[],
        workingPackage: WorkingPackage
    ): RecommendationCandidate | undefined {
        let bestCandidate: RecommendationCandidate | undefined;
        let bestScore = Number.NEGATIVE_INFINITY;
        const familyCounts = new Map<string, number>();

        for (const item of workingPackage.items.values()) {
            const selected = candidates.find(
                (c) => c.productId === item.productId
            );

            if (!selected?.productFamily) {
                continue;
            }

            familyCounts.set(
                selected.productFamily,
                (familyCounts.get(selected.productFamily) ?? 0) + 1
            );
        }

        for (const candidate of candidates) {
            if (!workingPackage.items.has(candidate.productId)) {
                continue;
            }

            if (candidate.price > remainingBudget) {
                continue;
            }

            if (!this.canIncreaseQuantity(candidate, workingPackage)) {
                continue;
            }

            const item = workingPackage.items.get(candidate.productId)!;
            const familyCount = candidate.productFamily
                ? familyCounts.get(candidate.productFamily) ?? 0
                : 0;

            const quantityPenalty = item.selectedQty - 1;
            const dominancePenalty = Math.floor((item.selectedQty * item.selectedQty) / 2);
            const FAMILY_PENALTY = 8;

            const adjustedScore = candidate.score
                - quantityPenalty
                - (familyCount * FAMILY_PENALTY)
                - dominancePenalty;

            if (adjustedScore > bestScore) {
                bestScore = adjustedScore;
                bestCandidate = candidate;
            }
        }

        return bestCandidate;
    }

    private fillRemainingBudget(
        budget: number,
        candidates: RecommendationCandidate[],
        workingPackage: WorkingPackage
    ): void {
        while (true) {
            const remainingBudget = budget - workingPackage.total;

            if (remainingBudget <= 0) {
                return;
            }

            const candidate = this.findBestNewCandidate(
                remainingBudget,
                candidates,
                workingPackage
            );

            if (!candidate) {
                return;
            }

            workingPackage.items.set(candidate.productId, {
                productId: candidate.productId,
                selectedQty: 1,
            });

            workingPackage.total += candidate.price;
            workingPackage.score += candidate.score;
        }
    }

    private canIncreaseQuantity(
        candidate: RecommendationCandidate,

        workingPackage: WorkingPackage
    ): boolean {
        const item = workingPackage.items.get(candidate.productId);

        if (!item) {
            return false;
        }

        if (item.selectedQty >= candidate.quantity) {
            return false;
        }

        if (item.selectedQty >= MAX_AI_PRODUCT_QTY) {
            return false;
        }

        return true;
    }

    private logPackageSummary(
        budget: number,

        total: number,

        packageItems: PackageItem[],

        remainingCandidates: number
    ): void {
        console.log(
            "AI PACKAGE SUMMARY",

            JSON.stringify({
                budget,

                total,

                utilization: Number(((total / budget) * 100).toFixed(2)),

                uniqueProducts: packageItems.length,

                totalItems: packageItems.reduce(
                    (sum, item) => sum + item.selectedQty,

                    0
                ),
                remainingCandidates,
                packageItems,
            })
        );
    }
}
