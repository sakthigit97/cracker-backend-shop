import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";
import { success, error } from "../libs/response";

export async function handler(
    event: APIGatewayProxyEventV2
) {

    try {

        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }
        const limit = Number(
            event.queryStringParameters?.limit ?? 20
        );

        const status = event.queryStringParameters?.status;
        const cursor =
            event.queryStringParameters?.cursor
                ? JSON.parse(
                    decodeURIComponent(
                        event.queryStringParameters.cursor
                    )
                )
                : undefined;

        const service = new BulkOrderService();
        const result = await service.adminGetOrders(
            limit,
            cursor,
            status
        );

        return success(result);

    } catch (e: any) {
        console.error("Admin Get Bulk Orders Error:", e);
        return error(
            e.message || "Unable to fetch bulk orders."
        );

    }

}