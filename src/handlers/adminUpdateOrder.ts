import { verifyJwt } from "../utils/auth";
import { AdminUpdateOrderService } from "../services/adminUpdateOrder.service";
import { NotificationService } from "../utils/notification.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminConfigService } from "../services/adminConfig.service";

const notify = new NotificationService();
const service = new AdminUpdateOrderService();
export const handler = async (event: any) => {
    const repo = new AdminConfigRepo();
    const configservice = new AdminConfigService(repo);
    const config = await configservice.getConfig();
    try {
        const { role, userId } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const orderId = event.pathParameters?.orderId;
        if (!orderId) {
            return { statusCode: 400, body: "orderId required" };
        }

        const body = JSON.parse(event.body || "{}");
        const totalAmount = body.amount || 0;
        const mobile = body.mobile.trim() || '';
        const updated = await service.updateOrder({
            orderId,
            status: body.status,
            adminComment: body.adminComment,
            adminId: userId,
        });

        if (body.status == 'ORDER_CONFIRMED' && (config.IsOrderConfirmSMSEnabled || false)) {
            await notify.send({
                email: body?.email,
                phone: mobile,
                subject: "Order Confirmed",
                smsTemplateId: process.env.CONFIRM_ORDER_TID!,
                message: `Your order ${orderId} is updated with status ${body.status}`,
                smsVariables: {
                    ORDERID: orderId,
                    ORDERAMOUNT: totalAmount,
                    SVKCURL: process.env.DOMAIN! || '',
                    USERNAME: 'User'
                },
            });
        }

        if (body.status == 'PAYMENT_CONFIRMED' && (config.isPaidSMSEnabled || false)) {
            await notify.send({
                email: body?.email,
                phone: mobile,
                subject: "Payment Confirmed",
                smsTemplateId: process.env.PAYMENT_CONFIRM_TID!,
                message: `Your order ${orderId} is updated with status ${body.status}`,
                smsVariables: {
                    ORDERID: orderId,
                    ORDERAMOUNT: totalAmount,
                    SVKCURL: process.env.DOMAIN! || '',
                    USERNAME: 'User'
                },
            });
        }

        if (body.status == 'DISPATCHED' && (config.isOrderDispatchSMSEnabled || false)) {
            await notify.send({
                email: body?.email,
                phone: mobile,
                subject: "Order Dispatched",
                smsTemplateId: process.env.ORDER_DISPATCHED_TID!,
                message: `Your order ${orderId} is updated with status ${body.status}`,
                smsVariables: {
                    ORDERID: orderId,
                    ORDERAMOUNT: totalAmount,
                    SVKCURL: process.env.DOMAIN! || '',
                    USERNAME: 'User'
                },
            });
        }


        return {
            statusCode: 200,
            body: JSON.stringify(updated),
        };
    } catch (err: any) {
        console.error("Admin update order error", err);
        return {
            statusCode: err.statusCode || 500,
            body: err.message || "Internal Server Error",
        };
    }
};
