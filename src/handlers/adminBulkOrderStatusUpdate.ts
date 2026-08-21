import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";
import { success, error } from "../libs/response";

export async function handler(
    event: APIGatewayProxyEventV2
) {

    try {

        const { role, userId } = verifyJwt(event);
        if (role === "user") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const orderId = event.pathParameters?.orderId;
        if (!orderId) {
            return error("Order Id is required.");
        }

        const body = JSON.parse(
            event.body || "{}"
        );

        const service = new BulkOrderService();
        const result = await service.updateStatus(
            orderId,
            body.status,
            userId,
            body.adminComment
        );
        return success(result);

    } catch (e: any) {

        console.error(
            "Update Bulk Order Status Error:",
            e
        );

        return error(
            e.message ||
            "Unable to update bulk order status."
        );

    }

}