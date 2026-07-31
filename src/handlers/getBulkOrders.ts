import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";
import { success, error } from "../libs/response";

export async function handler(event: APIGatewayProxyEventV2) {

    try {

        const user = verifyJwt(event);
        const limit = Number(
            event.queryStringParameters?.limit ?? 20
        );

        const cursor = event.queryStringParameters?.cursor
            ? JSON.parse(
                decodeURIComponent(
                    event.queryStringParameters.cursor
                )
            )
            : undefined;

        const service = new BulkOrderService();

        const result = await service.getOrders(
            user.userId,
            limit,
            cursor
        );

        return success(result);

    } catch (error: any) {

        console.error("Get Bulk Orders Error:", error);
        return error(
            error.message || "Unable to fetch bulk orders."
        );

    }

}