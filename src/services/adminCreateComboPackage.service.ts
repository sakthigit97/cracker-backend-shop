import { AdminCreateProductService } from "./adminCreateProduct.service";
import { AdminConfigService } from "./adminConfig.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminUpdateProductService } from "./adminUpdateProduct.service";

export class AdminCreateComboPackageService {
    constructor(
        private productService = new AdminCreateProductService(),
        private configService = new AdminConfigService(
            new AdminConfigRepo()
        ),
        private productUpdateService =
            new AdminUpdateProductService()
    ) { }

    async createComboPackage(input: {
        name: string;
        price: number;
        productIds: string[];
    }) {
        const comboName = input.name.trim();

        if (!comboName) {
            throw new Error("Combo name is required");
        }

        if (!input.price || input.price <= 0) {
            throw new Error("Combo price must be greater than 0");
        }

        if (!input.productIds?.length) {
            throw new Error("At least one product is required");
        }

        const config = await this.configService.getConfig();
        const packageTags = config.packageTags || [];
        const normalizedName = comboName.toLowerCase();
        const duplicateExists = packageTags.some(
            (tag: any) =>
                tag.name?.trim().toLowerCase() === normalizedName
        );

        if (duplicateExists) {
            throw new Error(
                "A package with this name already exists"
            );
        }

        const comboProductId = `prod-${crypto.randomUUID()}`;
        const comboId = crypto.randomUUID();
        const comboProduct = await this.productService.createProduct({
            productId: comboProductId,
            name: comboName,
            price: Number(input.price),
            quantity: 1,
            brandId: "brand-fa700591-52d8-4ef0-9e22-1b4000b6baa9",
            categoryId: "cat-4b7df8e5-4e0a-49f8-a2dd-0f2b345d4222",
            imageUrls: [],
            searchText: comboName,
            description: comboName,
            packageTagIds: [],
            aiTags: [],
            isComboPackage: true,
            isRetailOnly: true,
            isBulkOrderOnly: false,
            bulkOrderBasePrice: null,
            cartonQty: null,
            packQuantity: 1,
            packUnit: "PACK",
            isGiftPack: false,
        });

        await this.configService.updateConfig({
            packageTags: [
                ...packageTags,
                {
                    id: comboId,
                    name: comboName,
                    imageUrl: "",
                    productId: comboProduct.productId,
                    offerPrice: Number(input.price),
                },
            ],
        });

        for (const productId of input.productIds) {
            await this.productUpdateService.addPackageTagId(
                productId,
                comboId
            );
        }

        return {
            comboProduct,
            comboId,
        };
    }
}