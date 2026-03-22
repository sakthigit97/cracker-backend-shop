import { AdminGetProductRepository } from "../repo/adminGetProduct.repo";

export class AdminGetProductService {
    constructor(private repo = new AdminGetProductRepository()) { }

    async getProduct(productId: string) {
        return this.repo.getById(productId);
    }
}