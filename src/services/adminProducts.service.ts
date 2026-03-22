import { AdminProductsRepository } from "../repo/adminProducts.repo";

interface GetProductsParams {
    brandId?: string;
    categoryId?: string;
    isActive?: string;
    search?: string;
    limit: number;
    cursor?: any;
}

export class AdminProductsService {
    constructor(private repo = new AdminProductsRepository()) { }

    async getProducts(params: GetProductsParams) {
        return this.repo.fetchProducts(params);
    }
}