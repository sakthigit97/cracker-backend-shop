import { verifyJwt } from "../utils/auth";
import { OrderService } from "../services/order.service";
import { NotificationService } from "../utils/notification.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminConfigService } from "../services/adminConfig.service";

const orderService = new OrderService();
export const handler = async (event: any) => {
    const notify = new NotificationService();
    const repo = new AdminConfigRepo();
    const service = new AdminConfigService(repo);
    const config = await service.getConfig();
    const iscartUpdatedSMSEnabled = config?.isCartUpdateSMSEnabled || false;

    try {
        const { userId, role } = verifyJwt(event);
        const orderId = event.pathParameters?.orderId;

        const body = JSON.parse(event.body || "{}");
        const items = body.items;

        const order = await orderService.adjustOrder({
            userId,
            role,
            orderId,
            items,
        });

        if (iscartUpdatedSMSEnabled && body?.mobile) {
            await notify.send({
                email: body?.email,
                phone: body?.mobile,
                subject: "Cart Updated",
                smsTemplateId: process.env.CART_UPDATED_TID!,
                message: `Your cart is adjusted by ${userId}`,
                smsVariables: {
                    ORDERID: orderId,
                    UPDATEDBY: userId || '',
                    SVKCURL: process.env.DOMAIN! || '',
                },
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ order }),
        };
    } catch (err: any) {
        console.error("Adjust order failed", err);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message || "Unable to adjust order",
            }),
        };
    }
};
