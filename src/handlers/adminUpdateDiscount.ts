import { verifyJwt } from "../utils/auth";
import { AdminDiscountService } from "../services/adminDiscount.service";

const service = new AdminDiscountService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const discountId = event.pathParameters?.discountId;

        if (!discountId) {
            return { statusCode: 400, body: "discountId required" };
        }

        const body = JSON.parse(event.body || "{}");
        await service.updateDiscount(discountId, body);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (err) {
        console.error("UpdateDiscount error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};