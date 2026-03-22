import { AdminUpdateProductRepository } from "../repo/adminUpdateProduct.repo";

interface UpdateProductInput {
    name?: string;
    price?: number;
    quantity?: number;
    brandId?: string;
    categoryId?: string;
    imageUrls?: string[];
    videoUrl?: string;
    searchText?: string;
    description?: string;
    isActive?: string;
}

export class AdminUpdateProductService {
    constructor(private repo = new AdminUpdateProductRepository()) { }

    async updateProduct(productId: string, input: UpdateProductInput) {
        if (!input || Object.keys(input).length === 0) {
            return null;
        }

        return this.repo.updateProduct(productId, input);
    }
}