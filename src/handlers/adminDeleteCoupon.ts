import { verifyJwt } from "../utils/auth";
import { CouponService } from "../services/coupon.service";

const service = new CouponService();

export const handler = async (event: any) => {

    try {

        verifyJwt(event);

        const couponCode = event.pathParameters?.couponCode;

        if (!couponCode) {
            throw new Error("Coupon Code is required");
        }

        await service.deleteCoupon(couponCode);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Coupon deleted successfully",
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