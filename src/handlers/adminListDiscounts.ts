import { verifyJwt } from "../utils/auth";
import { AdminDiscountService } from "../services/adminDiscount.service";

const service = new AdminDiscountService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const items = await service.listDiscounts();
        return {
            statusCode: 200,
            body: JSON.stringify({
                items,
            }),
        };
    } catch (err) {
        console.error("ListDiscounts error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};