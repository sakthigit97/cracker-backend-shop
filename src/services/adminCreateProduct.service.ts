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
    packageTagIds?: string[];
    aiTags?: string[];
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
            packageTagIds: input.packageTagIds || [],
            aiTags: input.aiTags || [],
            isActive: input.isActive ?? "true",
            createdAt: new Date().toISOString(),
        };

        await this.repo.putProduct(product);
        return product;
    }
}