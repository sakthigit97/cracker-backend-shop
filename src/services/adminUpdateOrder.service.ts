import { AdminUpdateOrderRepository } from "../repo/adminUpdateOrder.repo";
import { OrderRepository } from "../repo/order.repo";

export const STATUS_ORDER = [
    "ORDER_PLACED",
    "ORDER_CONFIRMED",
    "PAYMENT_CONFIRMED",
    "ORDER_PACKED",
    "DISPATCHED",
    "CANCELLED",
];

export class AdminUpdateOrderService {
    constructor(
        private repo = new AdminUpdateOrderRepository(),
        private orderRepo = new OrderRepository()
    ) { }

    async updateOrder(input: {
        orderId: string;
        status?: string;
        adminComment?: string;
        adminId: string;
    }) {
        if (input.status === undefined && input.adminComment === undefined) {
            throw {
                statusCode: 400,
                message: "Nothing to update",
            };
        }

        const existing = await this.repo.getOrderById(input.orderId);
        if (!existing) {
            throw {
                statusCode: 404,
                message: "Order not found",
            };
        }

        if (input.status && !STATUS_ORDER.includes(input.status)) {
            throw {
                statusCode: 400,
                message: "Invalid status value",
            };
        }

        const updatedOrder = await this.repo.updateOrder({
            orderId: input.orderId,
            status: input.status,
            adminComment: input.adminComment,
            adminId: input.adminId,
        });

        if (input.status === "DISPATCHED") {
            await this.handleReferralReward(existing.userId);
        }

        return updatedOrder;
    }

    private async handleReferralReward(userId: string) {
        if (!userId) return;

        const user = await this.orderRepo.getUserByMobile(userId);
        if (!user) return;

        if (!user.referredBy || user.referredBy === "") return;
        if (user.referralRewarded === true) return;

        const config = await this.orderRepo.getAdminConfig();
        const isReferralEnabled = config.isReferralEnabled === true;
        const rewardAmount = Number(config.referralRewardAmount) || 0;

        if (!isReferralEnabled || rewardAmount <= 0) return;

        const updated = await this.orderRepo.markReferralRewarded(userId);
        if (!updated) return;

        await this.orderRepo.addWalletCreditByReferralCode(
            user.referredBy,
            rewardAmount
        );
    }
}