import { CouponService } from "../services/coupon.service";
import { verifyJwt } from "../utils/auth";

const service = new CouponService();
export const handler = async (event: any) => {

    try {

        verifyJwt(event);
        const body = JSON.parse(event.body ?? "{}");
        const coupon = await service.createCoupon(body);

        return {
            statusCode: 201,
            body: JSON.stringify({
                success: true,
                data: coupon,
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