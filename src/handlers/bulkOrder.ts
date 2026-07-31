import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";

export const handler = async (event: any) => {
    try {

        const { userId } = verifyJwt(event);
        const body = JSON.parse(event.body || "{}");
        const service = new BulkOrderService();
        const result = await service.createOrder(
            userId,
            body
        );

        return {
            statusCode: 201,
            body: JSON.stringify(result),
        };

    } catch (err: any) {

        console.error(
            "Create bulk order failed",
            err
        );

        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    err.message ||
                    "Internal Server Error",
            }),
        };

    }
};