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
    description: string;
    isActive?: string;
    packageTagIds?: string[];
    aiTags?: string[];
    isComboPackage?: boolean;
    isRetailOnly?: boolean;
    isBulkOrderOnly?: boolean;
    bulkOrderBasePrice?: number | null;
    cartonQty?: number | null;
    packQuantity: number;
    packUnit: string;
    isGiftPack?: boolean;
}

export class AdminCreateProductService {
    constructor(
        private repo = new AdminCreateProductRepository()
    ) { }

    async createProduct(input: CreateProductInput) {

        const sequenceNumber =
            await this.repo.getNextSequenceNumber(
                input.categoryId
            );

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
            packageTagIds:
                input.packageTagIds || [],
            aiTags:
                input.aiTags || [],
            isActive:
                input.isActive ?? "true",
            isComboPackage:
                input.isComboPackage ?? false,
            isRetailOnly:
                input.isRetailOnly ?? false,
            isBulkOrderOnly:
                input.isBulkOrderOnly ?? false,
            bulkOrderBasePrice:
                input.bulkOrderBasePrice ?? null,
            cartonQty:
                input.cartonQty ?? null,

            packQuantity: Number(input.packQuantity),
            packUnit: input.packUnit.trim(),
            isGiftPack:
                input.isGiftPack ?? false,

            sequenceNumber,
            createdAt: new Date().toISOString(),
        };

        await this.repo.putProduct(product);

        return product;
    }
}