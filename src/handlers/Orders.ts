import { verifyJwt } from "../utils/auth";
import { CartService } from "../services/cart.service";
import { OrderService } from "../services/order.service";
import { NotificationService } from "../utils/notification.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminConfigService } from "../services/adminConfig.service";

const notify = new NotificationService();
const cartService = new CartService();
const orderService = new OrderService();

export const handler = async (event: any) => {
    try {


        const repo = new AdminConfigRepo();
        const service = new AdminConfigService(repo);
        const config = await service.getConfig();
        const { userId } = verifyJwt(event);
        const userCartId = `USER#${userId}`;
        const body = JSON.parse(event.body || "{}");
        const rawAddress = body.address;
        const address = typeof rawAddress === "string" ? rawAddress.trim() : "";
        if (!address || address.length < 10) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Address is required",
                }),
            };
        }

        const paymentMode =
            body.paymentMode === "ONLINE"
                ? "ONLINE"
                : "OFFLINE";

        const paymentStatus =
            typeof body.paymentStatus === "string"
                ? body.paymentStatus
                : paymentMode === "ONLINE"
                    ? "PENDING"
                    : "NOT_REQUIRED";

        const transactionId = typeof body.transactionId === "string"
            ? body.transactionId
            : null;

        const couponCode = typeof body.couponCode === "string"
            ? body.couponCode.trim().toUpperCase()
            : undefined;


        const couponType = typeof body.couponType === "string"
            ? body.couponType.trim().toUpperCase()
            : undefined;

        const couponValue = Number(
            body.couponValue || 0
        );

        const couponDiscount = Number(
            body.couponDiscount || 0
        );

        const subtotal = Number(
            body.subtotal || 0
        );

        const nonComboProductTotal = Number(
            body.nonComboProductTotal || 0
        );

        const comboPackageTotal = Number(
            body.comboPackageTotal || 0
        );

        const packagingCharge = Number(
            body.packagingCharge || 0
        );

        const amountBeforeDiscount = Number(
            body.amountBeforeDiscount || subtotal + packagingCharge
        );

        const amountAfterDiscount = Number(
            body.amountAfterDiscount || amountBeforeDiscount
        );

        const gstAmount = Number(
            body.gstAmount || 0
        );

        const grandTotal = Number(
            body.grandTotal || 0
        );

        const walletUsed = Number(
            body.walletUsed || 0
        );

        const finalPayable = Number(
            body.finalPayable || 0
        );

        if (couponDiscount < 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid coupon discount",
                }),
            };
        }

        if (subtotal <= 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid subtotal",
                }),
            };
        }

        if (grandTotal <= 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid grand total",
                }),
            };
        }

        if (nonComboProductTotal < 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid non-combo product total",
                }),
            };
        }

        if (comboPackageTotal < 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid combo package total",
                }),
            };
        }

        if (packagingCharge < 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid packaging charge",
                }),
            };
        }

        if (amountBeforeDiscount < 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid amount before discount",
                }),
            };
        }

        if (amountAfterDiscount < 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid amount after discount",
                }),
            };
        }

        if (gstAmount < 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid GST amount",
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

        if (finalPayable < 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid final payable amount",
                }),
            };
        }

        const expectedSubtotal = nonComboProductTotal + comboPackageTotal;
        if (subtotal !== expectedSubtotal) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Subtotal does not match product totals",
                }),
            };
        }

        const expectedAmountBeforeDiscount = subtotal + packagingCharge;
        if (amountBeforeDiscount !== expectedAmountBeforeDiscount) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid amount before discount",
                }),
            };
        }

        if (couponDiscount > amountBeforeDiscount) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Coupon discount exceeds order amount",
                }),
            };
        }

        const expectedAmountAfterDiscount = amountBeforeDiscount - couponDiscount;
        if (amountAfterDiscount !== expectedAmountAfterDiscount) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid amount after discount",
                }),
            };
        }

        const expectedGrandTotal = amountAfterDiscount + gstAmount;
        if (grandTotal !== expectedGrandTotal) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid grand total",
                }),
            };
        }

        const expectedFinalPayable = grandTotal - walletUsed;
        if (finalPayable !== expectedFinalPayable) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid final payable amount",
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

        const orderId = await orderService.createOrder({
            userId,
            address,
            cartItems,
            paymentMode,
            paymentStatus,
            transactionId,
            subtotal,
            couponCode,
            couponDiscount,
            couponType,
            couponValue,
            nonComboProductTotal,
            comboPackageTotal,
            packagingCharge,
            amountBeforeDiscount,
            amountAfterDiscount,
            gstAmount,
            grandTotal,
            walletUsed,
            finalPayable,
        });

        await cartService.clear(userCartId);
        if (config.isOrderPlaceSMSEnabled) {
            await notify.send({
                email: body?.email,
                phone: body?.mobile,
                subject: "Order Placed",
                smsTemplateId: process.env.ORDER_SUBMIT_TID!,
                message: `Your order ${orderId} is confirmed`,
                smsVariables: {
                    ORDERID: orderId,
                    ORDERAMOUNT: finalPayable,
                    SVKCURL: process.env.DOMAIN ?? "",
                },
            });
        }

        return {
            statusCode: 201,
            body: JSON.stringify({
                orderId,
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