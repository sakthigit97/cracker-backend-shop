import { CartService } from "../services/cart.service";
import crypto from "crypto";
import { getOptionalUserId } from "../utils/auth";

const service = new CartService();

function resolveCartContext(event: any) {
    const userId = getOptionalUserId(event);

    console.log("user id =>" + userId);
    if (userId) {
        return {
            pk: `USER#${userId}`,
            guestId: null,
        };
    }

    let guestId =
        event.headers?.["x-guest-id"] ||
        event.headers?.["X-Guest-Id"];

    if (!guestId) {
        guestId = crypto.randomUUID();
    }

    return {
        pk: `GUEST#${guestId}`,
        guestId,
    };
}

export const getCart = async (event: any) => {
    console.log("=== GET CART START ===");

    const { pk, guestId } = resolveCartContext(event);
    const items = await service.getCart(pk);

    console.log("Resolved cartId:", pk);
    console.log("Resolved guestId:", guestId);
    console.log("Items from DB:", items);

    return {
        statusCode: 200,
        headers: guestId ? { "x-guest-id": guestId } : {},
        body: JSON.stringify({
            items: items ?? []
        }),
    };
};

export const addItem = async (event: any) => {
    const { productId, qty } = JSON.parse(event.body);
    const { pk, guestId } = resolveCartContext(event);

    await service.addItem(pk, productId, qty);

    return {
        statusCode: 200,
        headers: guestId ? { "x-guest-id": guestId } : {},
        body: JSON.stringify({ success: true }),
    };
};

export const removeItem = async (event: any) => {
    const { productId } = JSON.parse(event.body);
    const { pk, guestId } = resolveCartContext(event);

    await service.removeItem(pk, productId);

    return {
        statusCode: 200,
        headers: guestId ? { "x-guest-id": guestId } : {},
        body: JSON.stringify({ success: true }),
    };
};

export const clearCart = async (event: any) => {
    const { pk, guestId } = resolveCartContext(event);
    await service.clear(pk);

    return {
        statusCode: 200,
        headers: guestId ? { "x-guest-id": guestId } : {},
        body: JSON.stringify({ success: true }),
    };
};