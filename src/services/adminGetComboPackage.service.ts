import { AdminGetComboPackageRepository } from "../repo/adminGetComboPackage.repo";

export class AdminGetComboPackageService {
    constructor(
        private repo = new AdminGetComboPackageRepository()
    ) { }

    async getComboPackage(comboId: string) {
        if (!comboId || !comboId.trim()) {
            return null;
        }

        return this.repo.getComboPackage(
            comboId.trim()
        );
    }
}