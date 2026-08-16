import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";
import {
    success,
    error as errorResponse,
} from "../libs/response";

export async function handler(
    event: APIGatewayProxyEventV2
) {
    try {
        const { role } =
            verifyJwt(event);

        if (role === "user") {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message: "Forbidden",
                }),
            };
        }

        const orderId =
            event.pathParameters?.orderId?.trim();

        if (!orderId) {
            return errorResponse(
                "Order Id is required."
            );
        }

        const service =
            new BulkOrderService();

        const order =
            await service.adminGetOrder(
                orderId
            );

        return success(order);

    } catch (e: any) {
        console.error(
            "Admin Get Bulk Order Error:",
            e
        );

        return errorResponse(
            e?.message ||
            "Unable to fetch bulk order."
        );
    }
}