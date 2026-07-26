import { CouponService } from "../services/coupon.service";

const service = new CouponService();
export const handler = async (event: any) => {

    try {

        const body = JSON.parse(event.body ?? "{}");
        const subtotal = Number(body.subtotal);

        if (!Number.isFinite(subtotal) || subtotal <= 0) {
            throw new Error("Valid subtotal is required");
        }

        const result = await service.validateCoupon(
            body.couponCode,
            subtotal
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                data: result,
            }),
        };

    } catch (err: any) {

        return {
            statusCode: 400,
            body: JSON.stringify({
                success: false,
                message: err.message,
            }),
        };

    }

};