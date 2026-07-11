import { GetPackageDetailsRepository }
    from "../repo/getPackageDetails.repo";

import { ProductService }
    from "./product.service";

export class GetPackageDetailsService {
    private productService =
        new ProductService();

    constructor(
        private repo =
            new GetPackageDetailsRepository()
    ) { }

    async getPackageDetails(
        packageId: string
    ) {
        const result =
            await this.repo.getPackageDetails(
                packageId
            );

        const items =
            await this.productService.batchGetProducts(
                result.productIds
            );

        const products = items.map(
            (p: any) => ({
                id: p.productId,
                name: p.name,
                image: p.image ?? null,
                price: p.price,
                originalPrice: p.originalPrice,
                discountText: p.discountText,
                categoryId: p.categoryId,
                brandId: p.brandId,
                qty: p.qty,
                searchText: p.searchText,
                isComboPackage: p.isComboPackage || false,
            })
        );

        return {
            package: result.package,
            products,
        };
    }
}