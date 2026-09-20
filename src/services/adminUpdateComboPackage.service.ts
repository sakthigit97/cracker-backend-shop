import { AdminUpdateComboPackageRepository } from "../repo/adminUpdateComboPackage.repo";

export class AdminUpdateComboPackageService {
    constructor(
        private repo = new AdminUpdateComboPackageRepository()
    ) { }

    async updateComboPackage(
        comboId: string,
        productIds: string[]
    ) {
        if (!comboId || !comboId.trim()) {
            throw new Error(
                "comboId is required"
            );
        }

        if (
            !Array.isArray(productIds) ||
            productIds.length === 0
        ) {
            throw new Error(
                "At least one product is required"
            );
        }

        const uniqueProductIds = [
            ...new Set(
                productIds.filter(
                    (id) =>
                        typeof id === "string" &&
                        id.trim()
                )
            ),
        ];

        if (uniqueProductIds.length === 0) {
            throw new Error(
                "At least one valid product is required"
            );
        }

        return this.repo.updateComboPackage(
            comboId.trim(),
            uniqueProductIds
        );
    }

    async deleteComboPackage(
        comboId: string
    ) {
        if (!comboId || !comboId.trim()) {
            throw new Error("comboId is required");
        }

        return this.repo.deleteComboPackage(
            comboId.trim()
        );
    }
}