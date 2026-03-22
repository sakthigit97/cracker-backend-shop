import { AdminDeactivateProductRepository } from "../repo/adminDeactivateProduct.repo";

export class AdminDeactivateProductService {
    constructor(
        private repo = new AdminDeactivateProductRepository()
    ) { }

    toggleProduct(productId: string) {
        return this.repo.toggleStatus(productId);
    }
}