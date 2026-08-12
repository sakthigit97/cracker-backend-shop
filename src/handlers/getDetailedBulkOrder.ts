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
        const user = verifyJwt(event);

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
            await service.getOrder(
                user.userId,
                orderId
            );

        return success(order);

    } catch (err: any) {
        console.error(
            "Get Bulk Order Error:",
            err
        );

        return errorResponse(
            err?.message ||
            "Unable to fetch bulk order."
        );
    }
}