import { verifyJwt } from "../utils/auth";
import { CartService } from "../services/cart.service";

const service = new CartService();

export const handler = async (event: any) => {
    try {
        const decoded = verifyJwt(event);
        const userId = decoded.userId;

        const body = JSON.parse(event.body || "{}");
        const guestItems: Record<string, number> =
            body.guestItems ?? {};

        if (Object.keys(guestItems).length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true }),
            };
        }

        await service.mergeCart(
            userId,
            guestItems
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (err: any) {
        console.error("Cart merge failed:", err);

        return {
            statusCode: 401,
            body: JSON.stringify({ message: err.message }),
        };
    }
};