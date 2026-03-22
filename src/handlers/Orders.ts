import { verifyJwt } from "../utils/auth";
import { CartService } from "../services/cart.service";
import { OrderService } from "../services/order.service";
import { NotificationService } from "../utils/notification.service";

const notify = new NotificationService();
const cartService = new CartService();
const orderService = new OrderService();

export const handler = async (event: any) => {
    try {
        const { userId } = verifyJwt(event);
        const userCartId = `USER#${userId}`;

        const body = JSON.parse(event.body || "{}");
        const rawAddress = body.address;
        const address = typeof rawAddress === "string" ? rawAddress.trim() : "";
        if (!address) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Address is required" }),
            };
        }

        const paymentMode = body.paymentMode === "ONLINE" ? "ONLINE" : "OFFLINE";
        const paymentStatus =
            typeof body.paymentStatus === "string"
                ? body.paymentStatus
                : paymentMode === "ONLINE"
                    ? "PENDING"
                    : "NOT_REQUIRED";

        const transactionId =
            typeof body.transactionId === "string"
                ? body.transactionId
                : null;

        const cartItems = await cartService.getCart(userCartId);
        if (!cartItems || cartItems.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Cart is empty" }),
            };
        }

        const orderId = await orderService.createOrder({
            userId,
            address,
            cartItems,
            paymentMode,
            paymentStatus,
            transactionId,
        });

        await cartService.clear(userCartId);

        // await notify.send({
        //     email: event?.body?.email,
        //     phone: event?.body?.mobile,
        //     subject: "Order Placed",
        //     message: `Your order ${orderId} is confirmed`,
        // });

        return {
            statusCode: 201,
            body: JSON.stringify({ orderId }),
        };
    } catch (err: any) {
        console.error("Create order failed", err);

        return {
            statusCode: 401,
            body: JSON.stringify({
                message: err.message || "Unauthorized",
            }),
        };
    }
};