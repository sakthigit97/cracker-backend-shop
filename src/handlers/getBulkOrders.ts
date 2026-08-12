import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";
import { success, error as errorResponse } from "../libs/response";

export async function handler(
    event: APIGatewayProxyEventV2
) {
    try {
        const user = verifyJwt(event);

        /*
         * Pagination
         *
         * Default: 20
         * Maximum: 100
         */
        const requestedLimit = Number(
            event.queryStringParameters?.limit ?? 20
        );

        const limit =
            Number.isFinite(requestedLimit) &&
                requestedLimit > 0
                ? Math.min(
                    Math.floor(requestedLimit),
                    100
                )
                : 20;

        /*
         * Decode pagination cursor.
         */
        let cursor: any | undefined;

        const cursorParam =
            event.queryStringParameters?.cursor;

        if (cursorParam) {
            try {
                cursor = JSON.parse(
                    decodeURIComponent(
                        cursorParam
                    )
                );
            } catch {
                return errorResponse(
                    "Invalid pagination cursor."
                );
            }
        }

        const service =
            new BulkOrderService();

        const result =
            await service.getOrders(
                user.userId,
                limit,
                cursor
            );

        return success(result);

    } catch (err: any) {
        console.error(
            "Get Bulk Orders Error:",
            err
        );

        return errorResponse(
            err?.message ||
            "Unable to fetch bulk orders."
        );
    }
}