import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";
import { success, error } from "../libs/response";

export async function handler(
    event: APIGatewayProxyEventV2
) {

    try {

        const user = verifyJwt(event);
        const orderId = event.pathParameters?.orderId;
        if (!orderId) {
            return error("Order Id is required.");
        }

        const service = new BulkOrderService();
        const order = await service.getOrder(
            user.userId,
            orderId
        );

        return success(order);

    } catch (error: any) {

        console.error("Get Bulk Order Error:", error);
        return error(
            error.message || "Unable to fetch bulk order."
        );
    }

}