import { PopularProductsRepository } from "../repo/popularProducts.repo";

export class PopularProductsService {
    constructor(private repo = new PopularProductsRepository()) { }

    async getPopularProducts(input: { limit: number }) {
        return this.repo.getPopularProducts(input.limit);
    }
}