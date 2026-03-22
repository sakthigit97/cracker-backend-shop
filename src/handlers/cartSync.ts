import { CartService } from "../services/cart.service";
import { verifyJwt } from "../utils/auth";

const service = new CartService();
export const handler = async (event: any) => {
    try {
        const { userId } = verifyJwt(event);
        const userCartId = `USER#${userId}`;
        const body = JSON.parse(event.body || "{}");
        const items: Record<string, number> = body.items || {};
        const mode = body.mode || "full";

        if (mode === "partial") {
            for (const [productId, qty] of Object.entries(items)) {
                if (qty === 0) {
                    await service.removeItem(userCartId, productId);
                } else {
                    await service.setItem(userCartId, productId, qty);
                }
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ success: true }),
            };
        }

        /* ---------- FULL SYNC (fallback) ---------- */
        await service.clear(userCartId);
        for (const [productId, qty] of Object.entries(items)) {
            if (qty > 0) {
                await service.addItem(userCartId, productId, qty);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (err: any) {
        console.error("Cart sync failed", err);

        return {
            statusCode: 401,
            body: JSON.stringify({
                message: err.message || "Unauthorized",
            }),
        };
    }
};