import { CartRepository } from "../repo/cart.repo";
import { ProductService } from "./product.service";

export class CartService {
    constructor(
        private repo = new CartRepository(),
        private productService = new ProductService()
    ) { }

    async getCart(pk: string) {
        return this.repo.getCart(pk);
    }

    async addItem(pk: string, productId: string, qty: number) {
        if (qty === 0) return;
        await this.repo.addItem(pk, productId, qty);
    }

    async removeItem(pk: string, productId: string) {
        await this.repo.removeItem(pk, productId);
    }

    async clear(pk: string) {
        await this.repo.clearCart(pk);
    }

    async setItem(cartId: string, productId: string, qty: number) {
        await this.repo.setItemQuantity(cartId, productId, qty);
    }

    async mergeCart(
        userId: string,
        guestItems: Record<string, number>
    ) {
        const userPk = `USER#${userId}`;
        for (const [productId, qty] of Object.entries(
            guestItems
        )) {
            await this.repo.addItem(
                userPk,
                productId,
                qty
            );
        }
    }

    async cleanupUnavailableItems(cartId: string) {
        const cartItems = await this.repo.getCart(cartId);

        if (!cartItems.length) {
            return {
                removedItems: [],
            };
        }

        const productIds = cartItems.map(
            (item) => item.itemId
        );

        const products =
            await this.productService.getProductsForCartCleanup(
                productIds
            );

        const productMap = new Map(
            products.map((product) => [
                product.productId,
                product,
            ])
        );

        const removedItems: {
            productId: string;
            productName: string;
        }[] = [];

        for (const item of cartItems) {
            const product = productMap.get(item.itemId);

            const isActive =
                product &&
                (product.isActive === true ||
                    product.isActive === "true");

            if (!isActive) {
                await this.repo.removeItem(
                    cartId,
                    item.itemId
                );

                removedItems.push({
                    productId: item.itemId,
                    productName:
                        product?.name || "Product",
                });
            }
        }

        return {
            removedItems,
        };
    }

}