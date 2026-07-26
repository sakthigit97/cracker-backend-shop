import { verifyJwt } from "../utils/auth";
import { CouponService } from "../services/coupon.service";

const service = new CouponService();

export const handler = async (event: any) => {

    try {

        verifyJwt(event);

        const coupons = await service.getCoupons();

        return {
            statusCode: 200,
        body: JSON.stringify({
                success: true,
                data: coupons,
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