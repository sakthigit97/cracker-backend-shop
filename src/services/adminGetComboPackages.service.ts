import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminGetComboPackagesRepository } from "../repo/adminGetComboPackages.repo";
import { AdminCategoryRepository } from "../repo/adminCategory.repo";

export class AdminGetComboPackagesService {
    constructor(
        private comboRepo = new AdminGetComboPackagesRepository(),
        private configRepo = new AdminConfigRepo(),
        private categoryRepo = new AdminCategoryRepository()
    ) { }

    async listComboPackages() {
        const [comboProducts, allProducts, config] =
            await Promise.all([
                this.comboRepo.listComboProducts(),
                this.comboRepo.listAllProducts(),
                this.configRepo.getGlobalConfig(),
            ]);

        const packageTags = config?.packageTags || [];

        const combos = comboProducts.map((comboProduct: any) => {
            const normalizeComboName = (value: any) =>
                String(value ?? "")
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, " ");

            const packageTag =
                packageTags.find(
                    (tag: any) =>
                        tag?.productId === comboProduct.productId
                ) ||
                packageTags.find(
                    (tag: any) =>
                        normalizeComboName(tag?.name) ===
                        normalizeComboName(comboProduct.name)
                );

            const comboId = packageTag?.id || null;
            const relatedProducts = comboId
                ? allProducts.filter(
                    (product: any) =>
                        product.isComboPackage !== true &&
                        Array.isArray(product.packageTagIds) &&
                        product.packageTagIds.includes(comboId)
                )
                : [];

            const products = relatedProducts.map(
                (product: any) => ({
                    productId: product.productId,
                    name: product.name,
                    mrp: Number(
                        product.mrp ??
                        product.price ??
                        0
                    ),
                    price: Number(
                        product.discountedPrice ??
                        product.price ??
                        0
                    ),
                    imageUrl:
                        product.imageUrls?.[0] ||
                        product.imageUrl ||
                        product.image ||
                        "",
                })
            );

            return {
                comboId,
                productId: comboProduct.productId,
                name: packageTag?.name || comboProduct.name,
                price: Number(comboProduct.price || 0),
                imageUrl:
                    packageTag?.imageUrl ||
                    comboProduct.imageUrls?.[0] ||
                    "",
                isActive:
                    comboProduct.isActive ?? "true",
                products,
                productIds: products.map(
                    (product: any) => product.productId
                ),
                productCount: products.length,
                createdAt:
                    comboProduct.createdAt || null,
            };
        });

        combos.sort((a: any, b: any) => {
            const dateA = a.createdAt
                ? new Date(a.createdAt).getTime()
                : 0;

            const dateB = b.createdAt
                ? new Date(b.createdAt).getTime()
                : 0;

            return dateB - dateA;
        });

        return combos;
    }


    async getComboProductNames(comboProductId: string) {
        const [allProducts, config, categoryResult] =
            await Promise.all([
                this.comboRepo.listAllProducts(),
                this.configRepo.getGlobalConfig(),
                this.categoryRepo.listCategories({
                    limit: 1000,
                }),
            ]);

        const packageTags = config?.packageTags || [];
        const categories = categoryResult.items || [];

        const packageTag = packageTags.find(
            (tag: any) =>
                tag?.productId === comboProductId
        );

        if (!packageTag?.id) {
            return {
                productNames: [],
            };
        }

        // Category order: categoryId -> sortOrder
        const categoryOrderMap = new Map<string, number>(
            categories.map((category: any) => [
                category.categoryId,
                Number(
                    category.sortOrder ??
                    Number.MAX_SAFE_INTEGER
                ),
            ])
        );

        // Get products belonging to this combo package
        const products = allProducts.filter(
            (product: any) =>
                product.isComboPackage !== true &&
                Array.isArray(product.packageTagIds) &&
                product.packageTagIds.includes(
                    packageTag.id
                )
        );

        // Sort by category first, then product sequence
        products.sort((a: any, b: any) => {
            const aCategoryOrder =
                categoryOrderMap.get(
                    a.categoryId ?? ""
                ) ?? Number.MAX_SAFE_INTEGER;

            const bCategoryOrder =
                categoryOrderMap.get(
                    b.categoryId ?? ""
                ) ?? Number.MAX_SAFE_INTEGER;

            const categoryDiff =
                aCategoryOrder - bCategoryOrder;

            if (categoryDiff !== 0) {
                return categoryDiff;
            }

            const aSequence =
                a.sequenceNumber == null
                    ? Number.MAX_SAFE_INTEGER
                    : Number(a.sequenceNumber);

            const bSequence =
                b.sequenceNumber == null
                    ? Number.MAX_SAFE_INTEGER
                    : Number(b.sequenceNumber);

            return aSequence - bSequence;
        });

        const productNames = products
            .map((product: any) =>
                String(product.name ?? "").trim()
            )
            .filter(Boolean);

        return {
            productNames,
        };
    }

}