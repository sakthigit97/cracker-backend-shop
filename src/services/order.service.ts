import { OrderRepository } from "../repo/order.repo";
import { OrderPricingService } from "./orderPricing.service";
import { CouponService } from "./coupon.service";

interface CreateOrderInput {
    userId: string;
    address: string;
    deliveryState: string;
    cartItems: {
        itemId: string;
        quantity: number;
    }[];
    paymentMode?: string;
    paymentStatus?: string;
    transactionId?: string | null;
    couponCode?: string | null;
    walletUsed: number;
}

const CANCELLABLE_STATUSES = ["ORDER_PLACED", "ORDER_CONFIRMED"];
export class OrderService {
    private couponService = new CouponService();
    private pricingService = new OrderPricingService();
    constructor(private repo = new OrderRepository()) { }

    async createOrder(input: CreateOrderInput): Promise<any> {
        const now = Date.now();
        const orderId = this.generateOrderId(now);
        const isTamilNadu = input.deliveryState.toLowerCase() === "tamil nadu";
        const deliveryDays = isTamilNadu ? 5 : 10;
        const expectedDelivery = now + deliveryDays * 24 * 60 * 60 * 1000;
        const items = await this.repo.buildItemsSnapshot(
            input.cartItems
        );
        const config = await this.repo.getAdminConfig();
        const amountBeforeDiscount = this.pricingService.calculateAmountBeforeDiscount(
            items,
            config
        );

        let couponResult;
        if (input.couponCode) {
            couponResult = await this.couponService.validateCoupon(
                input.couponCode,
                amountBeforeDiscount
            );
        }

        const pricing = this.pricingService.calculate({
            items,
            walletUsed: input.walletUsed,
            state: input.deliveryState,
            config,
            couponResult,
        });

        const user = await this.repo.getUserByMobile(input.userId);
        const availableCredit = Number(user?.walletCredit || 0);
        if (input.walletUsed > availableCredit) {
            throw new Error("Invalid wallet usage");
        }

        const paymentMode = input.paymentMode ?? "OFFLINE";
        const paymentStatus =
            input.paymentStatus ??
            (paymentMode === "ONLINE"
                ? "PENDING"
                : "NOT_REQUIRED");
        const transactionId = input.transactionId ?? null;

        const order = {
            orderId,
            meta: "ORDER",
            userId: input.userId,
            address: input.address,
            deliveryState: input.deliveryState,
            items,
            status: "ORDER_PLACED",
            totalProductAmount: pricing.totalProductAmount,
            nonComboProductTotal: pricing.nonComboProductTotal,
            comboPackageTotal: pricing.comboPackageTotal,
            packagingCharge: pricing.packagingCharge,
            amountBeforeDiscount: pricing.amountBeforeDiscount,
            couponCode: pricing.couponCode,
            couponType: pricing.couponType,
            couponValue: pricing.couponValue,
            couponDiscount: pricing.couponDiscount,
            amountAfterDiscount: pricing.amountAfterDiscount,
            gstAmount: pricing.gstAmount,
            grandTotal: pricing.grandTotal,
            walletUsed: pricing.walletUsed,
            finalPayable: pricing.finalPayable,
            paymentMode,
            paymentStatus,
            transactionId,
            expectedDelivery,
            createdAt: now,
            updatedAt: now,
            statusHistory: [
                {
                    status: "ORDER_PLACED",
                    at: now,
                    by: `USER#${input.userId}`,
                },
            ],
        };

        await this.repo.create(order);
        if (input.walletUsed > 0) {
            await this.repo.deductWalletCredit(
                input.userId,
                pricing.walletUsed
            );
        }

        if (pricing.couponCode) {
            await this.couponService.deleteCoupon(
                pricing.couponCode
            );
        }

        return {
            orderId,
            pricing
        };
    }

    async applyAdditionalDiscount(input: {
        orderId: string;
        userId: string;
        role: string;
        discountType: "FLAT" | "PERCENTAGE";
        discountValue: number;
    }) {
        const {
            orderId,
            userId,
            role,
            discountType,
            discountValue,
        } = input;

        if (!orderId) {
            throw new Error("Order ID required");
        }

        const order = await this.repo.getById(orderId);

        if (!order) {
            throw new Error("Order not found");
        }

        const allowedStatuses = [
            "ORDER_PLACED",
            "ORDER_CONFIRMED",
        ];

        if (!allowedStatuses.includes(order.status)) {
            throw new Error(
                "Additional discount cannot be applied at this stage"
            );
        }

        if (
            !Number.isFinite(discountValue) ||
            discountValue <= 0
        ) {
            throw new Error(
                "Discount value must be greater than 0"
            );
        }

        if (
            discountType !== "FLAT" &&
            discountType !== "PERCENTAGE"
        ) {
            throw new Error(
                "Invalid discount type"
            );
        }

        if (
            discountType === "PERCENTAGE" &&
            discountValue > 100
        ) {
            throw new Error(
                "Percentage discount cannot exceed 100%"
            );
        }

        const config = await this.repo.getAdminConfig();

        const productTotal = Number(
            order.totalProductAmount ?? 0
        );

        const amountBeforeDiscount = Number(
            order.amountBeforeDiscount ?? 0
        );

        const couponDiscount = Number(
            order.couponDiscount ?? 0
        );

        let additionalDiscount = 0;

        if (discountType === "PERCENTAGE") {
            additionalDiscount = Math.round(
                (productTotal * discountValue) / 100
            );
        } else {
            additionalDiscount = discountValue;
        }

        additionalDiscount = Math.min(
            Math.max(additionalDiscount, 0),
            productTotal,
            Math.max(
                0,
                amountBeforeDiscount - couponDiscount
            )
        );

        const amountAfterDiscount =
            amountBeforeDiscount -
            couponDiscount -
            additionalDiscount;

        const gstAmount = this.pricingService.calculateGSTForAdditionalDiscount(
            amountAfterDiscount,
            order.deliveryState,
            config
        );

        const grandTotal =
            amountAfterDiscount + gstAmount;

        const previousWalletUsed = Number(
            order.walletUsed ?? 0
        );

        const walletUsed = Math.min(
            Math.max(0, previousWalletUsed),
            grandTotal
        );

        const finalPayable = Math.max(
            0,
            grandTotal - walletUsed
        );

        const now = Date.now();
        await this.repo.updateDiscount(orderId, {
            additionalDiscount,
            additionalDiscountType: discountType,
            additionalDiscountValue: discountValue,
            amountAfterDiscount,
            gstAmount,
            grandTotal,
            walletUsed,
            finalPayable,
            updatedAt: now,
            modifiedAt: now,
            modifiedBy:
                role === "STAFF"
                    ? `STAFF#${userId}`
                    : `ADMIN#${userId}`,

            statusHistory: [
                ...(order.statusHistory || []),

                {
                    status: "ADDITIONAL_DISCOUNT_APPLIED",
                    at: now,
                    by:
                        role === "STAFF"
                            ? `STAFF#${userId}`
                            : `ADMIN#${userId}`,

                    additionalDiscount,
                    additionalDiscountType: discountType,
                    additionalDiscountValue: discountValue,
                },
            ],
        });

        return await this.repo.getById(orderId);
    }

    private generateOrderId(now: number): string {
        const d = new Date(now);

        const ymd =
            d.getFullYear().toString() +
            String(d.getMonth() + 1).padStart(2, "0") +
            String(d.getDate()).padStart(2, "0");

        const rand = Math.floor(1000 + Math.random() * 9000);
        return `ORD-${ymd}-${rand}`;
    }

    async getUserOrders(userId: string, limit: number, cursor?: any) {
        return this.repo.getOrdersByUser(userId, limit, cursor);
    }

    async cancelOrder(orderId: string, userId: string) {
        const order = await this.repo.getById(orderId);

        if (!order) throw new Error("Order not found");

        if (order.userId !== userId) throw new Error("Unauthorized");

        if (!CANCELLABLE_STATUSES.includes(order.status)) {
            throw new Error("Order cannot be cancelled at this stage");
        }

        const now = Date.now();
        await this.repo.updateStatus(orderId, {
            status: "CANCELLED",
            updatedAt: now,
            modifiedAt: now,
            modifiedBy: `USER#${userId}`,
            statusHistory: [
                ...(order.statusHistory || []),
                {
                    status: "CANCELLED",
                    at: now,
                    by: `USER#${userId}`,
                },
            ],
        });
    }

    async getOrderById(orderId: string) {
        const order = await this.repo.getById(orderId);
        if (!order) throw new Error("Order not found");
        return order;
    }

    async adjustOrder(input: {
        userId: string;
        role: string;
        orderId: string;
        items: {
            productId: string;
            quantity: number;
        }[];
        couponCode?: string | null;
        walletUsed: number;
    }) {
        const {
            userId,
            role,
            orderId,
            items,
            walletUsed,
        } = input;

        if (!orderId) {
            throw new Error("Order ID required");
        }

        if (!Array.isArray(items)) {
            throw new Error("Invalid items");
        }

        const order = await this.repo.getById(orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        const isAdmin = role !== "user";
        if (!isAdmin && order.userId !== userId) {
            throw new Error("Unauthorized");
        }

        const blockedStatuses = ["DISPATCHED", "CANCELLED"];
        if (blockedStatuses.includes(order.status)) {
            throw new Error("Order cannot be adjusted at this stage");
        }

        if (items.length === 0) {
            throw new Error("Order cannot be empty");
        }

        for (const item of items) {
            if (!item.productId) {
                throw new Error("Invalid productId");
            }

            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
                throw new Error("Quantity must be a positive integer");
            }
        }

        const cartItems = items.map(item => ({
            itemId: item.productId,
            quantity: item.quantity,
        }));
        const updatedItems = await this.repo.buildItemsSnapshot(cartItems);
        const config = await this.repo.getAdminConfig();
        let couponResult;
        if (order.couponCode) {
            couponResult = {
                couponCode: order.couponCode,
                couponType: order.couponType,
                couponValue: Number(order.couponValue ?? 0),
                couponDiscount: Number(order.couponDiscount ?? 0),
            };
        }


        const additionalDiscountType =
            order.additionalDiscountType ?? null;

        const additionalDiscountValue =
            Number(order.additionalDiscountValue ?? 0);

        let additionalDiscount = 0;

        const productTotal =
            updatedItems.reduce(
                (total, item) =>
                    total + Number(item.total ?? 0),
                0
            );

        if (
            additionalDiscountType === "PERCENTAGE" &&
            additionalDiscountValue > 0
        ) {
            additionalDiscount = Math.round(
                (productTotal * additionalDiscountValue) / 100
            );
        } else if (
            additionalDiscountType === "FLAT" &&
            additionalDiscountValue > 0
        ) {
            additionalDiscount =
                additionalDiscountValue;
        }

        additionalDiscount = Math.min(
            Math.max(additionalDiscount, 0),
            productTotal
        );

        const pricing = this.pricingService.calculate({
            items: updatedItems,
            walletUsed,
            state: order.deliveryState ?? order.address,
            config,
            couponResult,
            additionalDiscount,
        });

        const now = Date.now();

        await this.repo.updateItems(orderId, {
            items: updatedItems,

            totalProductAmount:
                pricing.totalProductAmount,

            nonComboProductTotal:
                pricing.nonComboProductTotal,

            comboPackageTotal:
                pricing.comboPackageTotal,

            packagingCharge:
                pricing.packagingCharge,

            amountBeforeDiscount:
                pricing.amountBeforeDiscount,

            couponCode:
                pricing.couponCode,

            couponType:
                pricing.couponType,

            couponValue:
                pricing.couponValue,

            couponDiscount:
                pricing.couponDiscount,

            additionalDiscount:
                pricing.additionalDiscount,

            additionalDiscountType:
                additionalDiscountType,

            additionalDiscountValue:
                additionalDiscountValue,

            amountAfterDiscount:
                pricing.amountAfterDiscount,

            gstAmount:
                pricing.gstAmount,

            grandTotal:
                pricing.grandTotal,

            walletUsed:
                pricing.walletUsed,

            finalPayable:
                pricing.finalPayable,

            updatedAt: now,

            modifiedAt: now,

            modifiedBy:
                isAdmin
                    ? "ADMIN"
                    : `USER#${userId}`,

            statusHistory: [
                ...(order.statusHistory || []),
                {
                    status: "ORDER_ADJUSTED",
                    at: now,
                    by:
                        isAdmin
                            ? `ADMIN#${userId}`
                            : `USER#${userId}`,
                },
            ],
        });

        return await this.repo.getById(orderId);
    }
}