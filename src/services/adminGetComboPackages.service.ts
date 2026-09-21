import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminGetComboPackagesRepository } from "../repo/adminGetComboPackages.repo";

export class AdminGetComboPackagesService {
    constructor(
        private comboRepo = new AdminGetComboPackagesRepository(),
        private configRepo = new AdminConfigRepo()
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
}