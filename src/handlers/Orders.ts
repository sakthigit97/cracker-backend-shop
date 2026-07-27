import { verifyJwt } from "../utils/auth";
import { CartService } from "../services/cart.service";
import { OrderService } from "../services/order.service";
import { NotificationService } from "../utils/notification.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminConfigService } from "../services/adminConfig.service";

export const handler = async (event: any) => {
    try {

        const notify = new NotificationService();
        const cartService = new CartService();
        const orderService = new OrderService();
        const repo = new AdminConfigRepo();
        const service = new AdminConfigService(repo);
        const config = await service.getConfig();

        const { userId } = verifyJwt(event);
        const userCartId = `USER#${userId}`;
        const body = JSON.parse(event.body || "{}");
        const rawAddress = body.address;
        const address = typeof rawAddress === "string" ? rawAddress.trim() : "";
        const paymentMode = body.paymentMode === "ONLINE" ? "ONLINE" : "OFFLINE";
        const paymentStatus = "PENDING";
        const transactionId = typeof body.transactionId === "string" ? body.transactionId : null;
        const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim().toUpperCase() : undefined;
        const walletUsed = Number(body.walletUsed || 0);

        if (!address || address.length < 10) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Address is required",
                }),
            };
        }

        if (walletUsed < 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid wallet amount",
                }),
            };
        }

        const cartItems = await cartService.getCart(userCartId);
        if (!cartItems || cartItems.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Cart is empty",
                }),
            };
        }

        const result = await orderService.createOrder({
            userId,
            address,
            cartItems,
            paymentMode,
            paymentStatus,
            transactionId,
            couponCode,
            walletUsed
        });

        const OrderId = result.orderId || '';
        await cartService.clear(userCartId);
        if (config.isOrderPlaceSMSEnabled) {
            await notify.send({
                email: body?.email,
                phone: body?.mobile,
                subject: "Order Placed",
                smsTemplateId: process.env.ORDER_SUBMIT_TID!,
                message: `Your order ${OrderId} is confirmed`,
                smsVariables: {
                    ORDERID: OrderId,
                    ORDERAMOUNT: result.pricing.finalPayable,
                    SVKCURL: process.env.DOMAIN ?? "",
                },
            });
        }

        return {
            statusCode: 201,
            body: JSON.stringify({
                OrderId,
            }),
        };
    } catch (err: any) {
        console.error("Create order failed", err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message || "Unauthorized",
            }),
        };
    }
};