import { AdminBrandRepository } from "../repo/adminBrand.repo";

export class AdminBrandService {
    constructor(private repo = new AdminBrandRepository()) { }

    async listBrands(filters: any) {
        return this.repo.listBrands(filters);
    }

    async getBrandById(brandId: string) {
        return this.repo.getBrandById(brandId);
    }

    async createBrand(data: any) {
        return this.repo.createBrand(data);
    }

    async updateBrand(brandId: string, data: any) {
        return this.repo.updateBrand(brandId, data);
    }

    async updateBrandStatus(brandId: string, isActive: boolean) {
        return this.repo.updateBrandStatus(brandId, isActive);
    }

    async deleteBrand(brandId: string) {
        return this.repo.deleteBrand(brandId);
    }
}