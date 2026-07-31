import { BulkOrderRepository } from "../repo/bulkOrder.repo";
import { ProductService } from "./product.service";
import { BulkOrderValidation } from "../utils/bulkOrderValidation";
import {
    BulkOrder,
    BulkOrderItem,
    BulkOrderPricing,
    CreateBulkOrderRequest,
} from "../types/bulkOrder";

const STATUS_ORDER = [
    "ORDER_PLACED",
    "ORDER_CONFIRMED",
    "PAYMENT_CONFIRMED",
    "ORDER_PACKED",
    "DISPATCHED",
    "CANCELLED",
];

export class BulkOrderService {
    constructor(
        private repo = new BulkOrderRepository(),
        private productService = new ProductService()
    ) { }

    private calculatePricing(
        items: BulkOrderItem[],
        state: string,
        config: any
    ): BulkOrderPricing {

        const productTotal = items.reduce(
            (sum, item) => sum + item.total,
            0
        );

        const packagingPercent = Number(
            config.packagingPercent ?? 0
        );

        const packagingCharge = Math.round(
            (productTotal * packagingPercent) / 100
        );

        const isTamilNadu = state?.trim().toLowerCase() === "tamil nadu";
        let gstPercent = Number(config.gstPercent ?? 0) / 2;
        const actualGstPercentage = config.gstPercent;
        if (
            isTamilNadu &&
            config.disableGstForTN
        ) {
            gstPercent = 0;
        }

        const gstAmount = Math.round(
            ((productTotal + packagingCharge) * gstPercent) / 100
        );

        const grandTotal =
            productTotal +
            packagingCharge +
            gstAmount;

        return {
            productTotal,
            packagingPercent,
            packagingCharge,
            gstPercent: actualGstPercentage,
            gstAmount,
            grandTotal,
        };
    }

    async createOrder(
        userId: string,
        request: CreateBulkOrderRequest
    ) {

        BulkOrderValidation.validateCreateRequest(request);
        const config = await this.repo.getAdminConfig();
        if (!config) {
            throw new Error("Admin configuration not found.");
        }
        const products = await this.loadProducts(request);

        const productMap = new Map(
            products.map(product => [
                product.productId,
                product,
            ])
        );

        this.validateProducts(
            request,
            productMap
        );

        const items = this.buildItems(
            request,
            productMap
        );

        const pricing = this.calculatePricing(
            items,
            request.address.state,
            config
        );

        this.validateScheme(
            request.schemeId,
            pricing.productTotal,
            config
        );

        const order = this.buildOrder(
            userId,
            request,
            items,
            pricing
        );

        await this.repo.create(order);
        return {
            orderId: order.orderId,
            pricing,
        };
    }

    private async loadProducts(
        request: CreateBulkOrderRequest
    ) {

        const ids = request.items.map(
            x => x.productId
        );

        return await this.productService.batchGetProducts(
            ids
        );

    }

    private validateProducts(
        request: CreateBulkOrderRequest,
        productMap: Map<string, any>
    ): void {

        if (productMap.size !== request.items.length) {
            throw new Error("One or more selected products are unavailable.");
        }

        for (const requestItem of request.items) {

            const product = productMap.get(
                requestItem.productId
            );

            if (!product) {
                throw new Error(
                    `Product not found: ${requestItem.productId}`
                );
            }

            const cartonQty = Number(product.cartonQty ?? 0);
            if (cartonQty <= 0) {
                throw new Error(
                    `Carton quantity is not configured for ${product.name}.`
                );
            }

            const schemePrice = this.getSchemePrice(
                product,
                request.schemeId
            );

            if (schemePrice <= 0) {
                throw new Error(
                    `Bulk price is not configured for ${product.name}.`
                );
            }

            if (
                !Number.isInteger(requestItem.quantity) ||
                requestItem.quantity <= 0
            ) {
                throw new Error(
                    `Invalid quantity for ${product.name}.`
                );
            }
        }
    }

    private getSchemePrice(
        product: any,
        schemeId: string
    ): number {

        switch (schemeId) {

            case "SCHEME1":
                return Number(product.scheme1Price ?? 0);

            case "SCHEME2":
                return Number(product.scheme2Price ?? 0);

            case "SCHEME3":
                return Number(product.scheme3Price ?? 0);

            case "SCHEME4":
                return Number(product.scheme4Price ?? 0);

            default:
                throw new Error(
                    `Invalid bulk scheme: ${schemeId}`
                );
        }

    }

    private buildItems(
        request: CreateBulkOrderRequest,
        productMap: Map<string, any>
    ): BulkOrderItem[] {

        return request.items.map(requestItem => {
            const product = productMap.get(
                requestItem.productId
            )!;

            const schemePrice = this.getSchemePrice(
                product,
                request.schemeId
            );

            const cartonQty = Number(
                product.cartonQty
            );

            const quantity = Number(
                requestItem.quantity
            );

            return {
                productId: product.productId,
                name: product.name,
                image: product.image,
                brand: product.brandName,
                categoryId: product.categoryId,
                cartonQty,
                schemePrice,
                quantity,
                total: schemePrice *
                    cartonQty *
                    quantity,
            };
        });
    }

    private validateScheme(
        schemeId: string,
        productTotal: number,
        config: any
    ): void {

        const schemes = config?.bulkSchemes;
        if (!Array.isArray(schemes) || schemes.length === 0) {
            throw new Error("Bulk schemes are not configured.");
        }

        const scheme = schemes.find(
            (s: any) => s.schemeId === schemeId
        );

        if (!scheme) {
            throw new Error("Invalid bulk scheme selected.");
        }

        const minAmount = Number(scheme.minAmount ?? 0);
        const maxAmount = Number(scheme.maxAmount ?? 0);

        if (productTotal < minAmount) {
            throw new Error(
                `Minimum order amount for ${scheme.schemeName} is ₹${minAmount}.`
            );
        }

        if (
            maxAmount > 0 &&
            productTotal > maxAmount
        ) {
            throw new Error(
                `Maximum order amount for ${scheme.schemeName} is ₹${maxAmount}.`
            );
        }

    }

    private buildOrder(
        userId: string,
        request: CreateBulkOrderRequest,
        items: BulkOrderItem[],
        pricing: BulkOrderPricing
    ): BulkOrder {

        const now = Date.now();

        return {

            orderId: this.generateOrderId(now),

            meta: "ORDER",

            userId,

            status: "ORDER_PLACED",

            schemeId: request.schemeId,

            remarks: request.remarks,

            address: request.address,

            items,

            pricing,

            createdAt: now,

            updatedAt: now,

            statusHistory: [
                {
                    status: "ORDER_PLACED",
                    at: now,
                    by: `USER#${userId}`,
                },
            ],
        };

    }

    private generateOrderId(
        now: number
    ) {

        const d = new Date(now);

        const ymd =
            d.getFullYear().toString() +
            String(d.getMonth() + 1).padStart(2, "0") +
            String(d.getDate()).padStart(2, "0");

        const rand =
            Math.floor(
                1000 + Math.random() * 9000
            );

        return `BOR-${ymd}-${rand}`;

    }

    async getOrders(
        userId: string,
        limit: number,
        cursor?: any
    ) {

        const result = await this.repo.getOrdersByUser(
            userId,
            limit,
            cursor
        );

        return {
            items: result.items.map((order: any) => ({
                orderId: order.orderId,
                userId: order.userId,
                status: order.status,
                schemeId: order.schemeId,
                createdAt: order.createdAt,
                pricing: order.pricing,
                items: order.items,
            })),
            nextCursor: result.nextCursor,
        };
    }

    async getOrder(
        userId: string,
        orderId: string
    ) {

        const order = await this.repo.getById(orderId);
        if (!order) {
            throw new Error("Bulk order not found.");
        }

        if (order.userId !== userId) {
            throw new Error("You are not authorized to view this bulk order.");
        }

        return order;

    }

    async adminGetOrders(
        limit: number,
        cursor?: any,
        status?: string
    ) {

        const result = await this.repo.getAdminOrders(
            limit,
            cursor,
            status
        );

        return {
            items: result.items.map((order: any) => ({
                orderId: order.orderId,
                userId: order.userId,
                status: order.status,
                schemeId: order.schemeId,
                createdAt: order.createdAt,
                customer: {
                    name: order.address?.name,
                    mobile: order.address?.mobile,
                },
                pricing: order.pricing,
                items: order.items,
            })),
            nextCursor: result.nextCursor,
        };
    }

    async adminGetOrder(orderId: string) {

        const order = await this.repo.getById(orderId);
        if (!order) {
            throw new Error("Bulk order not found.");
        }
        return order;
    }

    private addStatusHistory(
        history: any[] = [],
        status: string,
        by: string
    ) {

        return [
            ...history,
            {
                status,
                at: Date.now(),
                by,
            },
        ];

    }

    private validateStatus(status: string) {

        if (!STATUS_ORDER.includes(status)) {
            throw new Error("Invalid order status.");
        }

    }

    private validateStatusTransition(
        currentStatus: string,
        newStatus: string
    ) {

        const currentIndex = STATUS_ORDER.indexOf(currentStatus);
        const newIndex = STATUS_ORDER.indexOf(newStatus);

        if (newIndex === -1) {
            throw new Error("Invalid order status.");
        }

        if (currentStatus === newStatus) {
            throw new Error("Order is already in this status.");
        }

        if (currentStatus === "CANCELLED") {
            throw new Error("Cancelled orders cannot be updated.");
        }

        if (currentStatus === "DISPATCHED" && newStatus === "CANCELLED") {
            throw new Error("Dispatched orders cannot be cancelled.");
        }

        if (newIndex < currentIndex) {
            throw new Error("Order status cannot move backwards.");
        }

    }

    async updateStatus(
        orderId: string,
        status: string,
        adminId: string
    ) {

        const order = await this.repo.getById(orderId);
        if (!order) {
            throw new Error("Bulk order not found.");
        }

        this.validateStatus(status);

        this.validateStatusTransition(
            order.status,
            status
        );

        const now = Date.now();
        const statusHistory = this.addStatusHistory(
            order.statusHistory,
            status,
            adminId
        );

        await this.repo.updateStatus(orderId, {
            status,
            updatedAt: now,
            modifiedAt: now,
            modifiedBy: adminId,
            statusHistory,
        });

        return {
            message: "Bulk order status updated successfully.",
        };

    }

    async cancelOrder(
        userId: string,
        orderId: string
    ) {

        const order = await this.repo.getById(orderId);

        if (!order) {
            throw new Error("Bulk order not found.");
        }

        if (order.userId !== userId) {
            throw new Error("You are not authorized to cancel this bulk order.");
        }

        this.validateStatusTransition(
            order.status,
            "CANCELLED"
        );

        const now = Date.now();
        const statusHistory = this.addStatusHistory(
            order.statusHistory,
            "CANCELLED",
            `USER#${userId}`
        );

        await this.repo.updateStatus(orderId, {
            status: "CANCELLED",
            updatedAt: now,
            modifiedAt: now,
            modifiedBy: `USER#${userId}`,
            statusHistory,
        });

        return {
            message: "Bulk order cancelled successfully.",
        };
    }
}
