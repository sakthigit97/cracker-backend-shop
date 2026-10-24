import { CartService } from "../services/cart.service";
import { verifyJwt } from "../utils/auth";

const service = new CartService();

export const handler = async (event: any) => {
    try {
        const { userId } = verifyJwt(event);

        const cartId = `USER#${userId}`;

        const result =
            await service.cleanupUnavailableItems(cartId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                removedItems: result.removedItems,
            }),
        };
    } catch (err: any) {
        console.error("Cart cleanup failed", err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    err?.message ||
                    "Unable to cleanup cart.",
            }),
        };
    }
};