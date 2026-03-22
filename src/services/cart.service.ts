import { CartRepository } from "../repo/cart.repo";

export class CartService {
    constructor(private repo = new CartRepository()) { }

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
}