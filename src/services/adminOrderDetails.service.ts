import { AdminOrderDetailsRepository } from "../repo/adminOrderDetails.repo";

export class AdminOrderDetailsService {
    constructor(private repo = new AdminOrderDetailsRepository()) { }

    async getOrderDetails(orderId: string) {
        return this.repo.getOrderById(orderId);
    }
}
