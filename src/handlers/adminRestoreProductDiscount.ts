import { verifyJwt } from "../utils/auth";
import { AdminDiscountService } from "../services/adminDiscount.service";

const service = new AdminDiscountService();
export const handler = async (
    event: any
) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const result = await service.restoreProductDiscounts();
        return {
            statusCode:
                result.success === false
                    ? 400
                    : 200,

            body: JSON.stringify(result),
        };
    } catch (err) {
        console.error(
            "RestoreProductDiscounts error",
            err
        );

        return {
            statusCode: 500,
            body:
                "Internal Server Error",
        };
    }
};