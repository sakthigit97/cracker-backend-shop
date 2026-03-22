import { verifyJwt } from "../utils/auth";
import { AdminDiscountService } from "../services/adminDiscount.service";

const service = new AdminDiscountService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const body = JSON.parse(event.body || "{}");

        if (!body.targetId || !body.discountValue) {
            return {
                statusCode: 400,
                body: "Missing required fields",
            };
        }

        const created = await service.createDiscount(body);

        return {
            statusCode: 200,
            body: JSON.stringify(created),
        };
    } catch (err) {
        console.error("CreateDiscount error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};