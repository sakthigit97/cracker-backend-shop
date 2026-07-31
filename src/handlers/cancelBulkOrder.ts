import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";
import { success, error } from "../libs/response";

export async function handler(
    event: APIGatewayProxyEventV2
) {

    try {

        const { userId } = verifyJwt(event);
        const orderId = event.pathParameters?.orderId;
        if (!orderId) {
            return error("Order Id is required.");
        }

        const service = new BulkOrderService();
        const result = await service.cancelOrder(
            userId,
            orderId
        );

        return success(result);

    } catch (e: any) {

        console.error(
            "Cancel Bulk Order Error:",
            e
        );

        return error(
            e.message || "Unable to cancel bulk order."
        );

    }

}