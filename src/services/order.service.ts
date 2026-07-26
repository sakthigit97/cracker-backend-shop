import { OrderRepository } from "../repo/order.repo";
import { ProductRepository } from "../repo/product.repo";
import { CouponRepository } from "../repo/coupon.repo";

interface CreateOrderInput {
    userId: string;
    address: string;
    cartItems: {
        itemId: string;
        quantity: number;
    }[];
    paymentMode?: string;
    paymentStatus?: string;
    transactionId?: string | null;
    subtotal: number;
    nonComboProductTotal: number;
    comboPackageTotal: number;
    couponCode?: string;
    couponType?: "FLAT" | "PERCENTAGE";
    couponValue?: number;
    couponDiscount?: number;
    packagingCharge: number;
    amountBeforeDiscount: number;
    amountAfterDiscount: number;
    gstAmount: number;
    grandTotal: number;
    walletUsed: number;
    finalPayable: number;
}

const CANCELLABLE_STATUSES = ["ORDER_PLACED", "ORDER_CONFIRMED"];
export class OrderService {
    private couponRepo = new CouponRepository();
    constructor(private repo = new OrderRepository()) { }
    private productRepo = new ProductRepository();


    async createOrder(input: CreateOrderInput): Promise<string> {
        const now = Date.now();
        const orderId = this.generateOrderId(now);

        const isTamilNadu = input.address
            .toLowerCase()
            .includes("tamil nadu");

        const deliveryDays = isTamilNadu ? 5 : 10;
        const expectedDelivery = now + deliveryDays * 24 * 60 * 60 * 1000;
        const items = await this.repo.buildItemsSnapshot(
            input.cartItems
        );

        const user = await this.repo.getUserByMobile(input.userId);
        const availableCredit = Number(
            user?.walletCredit || 0
        );

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
            meta: "ORDER",
            orderId,
            userId: input.userId,
            address: input.address,
            status: "ORDER_PLACED",
            paymentMode,
            paymentStatus,
            transactionId,
            items,
            expectedDelivery,
            subtotal: input.subtotal,
            nonComboProductTotal: input.nonComboProductTotal,
            comboPackageTotal: input.comboPackageTotal,
            couponCode: input.couponCode ?? null,
            couponType: input.couponType ?? null,
            couponValue: input.couponValue ?? null,
            couponDiscount: input.couponDiscount ?? 0,
            packagingCharge: input.packagingCharge,
            amountBeforeDiscount: input.amountBeforeDiscount,
            amountAfterDiscount: input.amountAfterDiscount,
            gstAmount: input.gstAmount,
            grandTotal: input.grandTotal,
            walletUsed: input.walletUsed,
            finalPayable: input.finalPayable,
            statusHistory: [
                {
                    status: "ORDER_PLACED",
                    at: now,
                    by: `USER#${input.userId}`,
                },
            ],
            createdAt: now,
            updatedAt: now,
            modifiedAt: now,
            modifiedBy: `USER#${input.userId}`,
            adminComment: "",
        };

        await this.repo.create(order);
        if (input.walletUsed > 0) {
            await this.repo.deductWalletCredit(
                input.userId,
                input.walletUsed
            );
        }

        if (input.couponCode?.trim()) {
            await this.couponRepo.deleteCoupon(
                input.couponCode
            );
        }

        return orderId;
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
        subtotal: number;
        nonComboProductTotal: number;
        comboPackageTotal: number;
        couponCode?: string | null;
        couponType?: "FLAT" | "PERCENTAGE" | null;
        couponValue?: number | null;
        couponDiscount: number;
        packagingCharge: number;
        amountBeforeDiscount: number;
        amountAfterDiscount: number;
        gstAmount: number;
        grandTotal: number;
        walletUsed: number;
        finalPayable: number;
    }) {
        const {
            userId,
            role,
            orderId,
            items,
            subtotal,
            nonComboProductTotal,
            comboPackageTotal,
            couponCode,
            couponType,
            couponValue,
            couponDiscount,
            packagingCharge,
            amountBeforeDiscount,
            amountAfterDiscount,
            gstAmount,
            grandTotal,
            walletUsed,
            finalPayable,
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

        const isAdmin = role === "admin";

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

        const productIds = items.map(i => i.productId);
        const products = await this.productRepo.batchGet(productIds);
        if (products.length !== productIds.length) {
            throw new Error("One or more products not found");
        }

        const productMap = new Map(
            products.map((p: any) => [p.productId, p])
        );

        const updatedItems = items.map(({ productId, quantity }) => {
            const product = productMap.get(productId);

            if (!product) {
                throw new Error(`Product not found: ${productId}`);
            }

            return {
                productId,
                name: product.name,
                image: product.imageUrls?.[0] ?? null,
                price: product.price,
                quantity,
                total: product.price * quantity,
                originalPrice: product.originalPrice ?? null,
                discountText: product.discountText ?? "",
                isComboPackage: !!product.isComboPackage,
            };
        });

        const now = Date.now();
        await this.repo.updateItems(orderId, {
            items: updatedItems,
            subtotal,
            nonComboProductTotal,
            comboPackageTotal,
            couponCode,
            couponType,
            couponValue,
            couponDiscount,
            packagingCharge,
            amountBeforeDiscount,
            amountAfterDiscount,
            gstAmount,
            grandTotal,
            walletUsed,
            finalPayable,
            updatedAt: now,
            modifiedAt: now,
            modifiedBy: isAdmin ? "ADMIN" : `USER#${userId}`,
            statusHistory: [
                ...(order.statusHistory || []),
                {
                    status: "ORDER_ADJUSTED",
                    at: now,
                    by: isAdmin
                        ? "ADMIN"
                        : `USER#${userId}`,
                },
            ],
        });

        return await this.repo.getById(orderId);
    }

}