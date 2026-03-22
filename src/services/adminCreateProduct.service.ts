import { AdminCreateProductRepository } from "../repo/adminCreateProduct.repo";

interface CreateProductInput {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    brandId: string;
    categoryId: string;
    imageUrls: string[];
    videoUrl?: string;
    searchText: string;
    isActive?: string;
    description: string;
}

export class AdminCreateProductService {
    constructor(private repo = new AdminCreateProductRepository()) { }

    async createProduct(input: CreateProductInput) {
        const product = {
            productId: input.productId,
            name: input.name.trim(),
            price: Number(input.price),
            quantity: Number(input.quantity),
            brandId: input.brandId,
            categoryId: input.categoryId,
            imageUrls: input.imageUrls,
            videoUrl: input.videoUrl || null,
            searchText: input.searchText,
            description: input.description.trim(),
            isActive: input.isActive ?? "true",
            createdAt: new Date().toISOString(),
        };

        await this.repo.putProduct(product);
        return product;
    }
}