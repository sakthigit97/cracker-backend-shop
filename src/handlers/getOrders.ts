import { verifyJwt } from "../utils/auth";
import { OrderService } from "../services/order.service";

const service = new OrderService();

export const handler = async (event: any) => {
    try {
        const { userId } = verifyJwt(event);

        const limit = Number(event.queryStringParameters?.limit || 10);
        const cursor = event.queryStringParameters?.cursor
            ? JSON.parse(
                Buffer.from(
                    event.queryStringParameters.cursor,
                    "base64"
                ).toString("utf-8")
            )
            : undefined;

        const result = await service.getUserOrders(
            userId,
            limit,
            cursor
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                items: result.items,
                nextCursor: result.nextCursor
                    ? Buffer.from(
                        JSON.stringify(result.nextCursor)
                    ).toString("base64")
                    : null,
            }),
        };
    } catch (err: any) {
        console.error("Get orders failed", err);
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: err.message || "Unauthorized",
            }),
        };
    }
};