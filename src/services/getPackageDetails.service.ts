import { GetPackageDetailsRepository } from "../repo/getPackageDetails.repo";
import { ProductService } from "./product.service";

export class GetPackageDetailsService {
    private productService = new ProductService();

    constructor(
        private repo =
            new GetPackageDetailsRepository()
    ) { }

    async getPackageDetails(
        packageId: string
    ) {
        const result = await this.repo.getPackageDetails(
            packageId
        );

        const items = await this.productService.batchGetProducts(
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
                sequenceNumber: p.sequenceNumber || 0,
                cartonQty: p.cartonQty || 0,
                isBulkOnly: p.isBulkOnly || false,
                scheme1Price: p.scheme1Price || 0,
                scheme2Price: p.scheme2Price || 0,
                scheme3Price: p.scheme3Price || 0,
                scheme4Price: p.scheme4Price || 0,
            })
        );

        return {
            package: result.package,
            products,
        };
    }
}