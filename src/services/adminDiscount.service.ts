import { AdminDiscountRepo } from "../repo/adminDiscount.repo";

export class AdminDiscountService {
    constructor(private repo = new AdminDiscountRepo()) { }

    async listDiscounts() {
        return this.repo.listDiscounts();
    }

    async getDiscountById(discountId: string) {
        return this.repo.getDiscountById(discountId);
    }

    async createDiscount(payload: any) {
        return this.repo.createDiscount(payload);
    }

    async updateDiscount(discountId: string, payload: any) {
        return this.repo.updateDiscount(discountId, payload);
    }
}