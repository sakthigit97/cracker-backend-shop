import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";
import {
    success,
    error as errorResponse,
} from "../libs/response";

const VALID_STATUSES = new Set([
    "ORDER_PLACED",
    "ORDER_CONFIRMED",
    "PAYMENT_CONFIRMED",
    "ORDER_PACKED",
    "DISPATCHED",
    "CANCELLED",
]);

export async function handler(
    event: APIGatewayProxyEventV2
) {
    try {
        const { role } =
            verifyJwt(event);

        if (role !== "admin") {
            return errorResponse(
                "Forbidden",
                403
            );
        }

        /*
         * Pagination
         *
         * Default: 20
         * Maximum: 100
         */
        const requestedLimit =
            Number(
                event.queryStringParameters
                    ?.limit ?? 20
            );

        const limit =
            Number.isFinite(
                requestedLimit
            ) &&
                requestedLimit > 0
                ? Math.min(
                    Math.floor(
                        requestedLimit
                    ),
                    100
                )
                : 20;

        /*
         * Status filter
         */
        const rawStatus =
            event.queryStringParameters
                ?.status
                ?.trim();

        const status =
            rawStatus || undefined;

        if (
            status &&
            !VALID_STATUSES.has(status)
        ) {
            return errorResponse(
                "Invalid order status."
            );
        }

        /*
         * Pagination cursor
         */
        let cursor:
            | any
            | undefined;

        const cursorParam =
            event.queryStringParameters
                ?.cursor;

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
            await service.adminGetOrders(
                limit,
                cursor,
                status
            );

        return success(result);

    } catch (e: any) {
        console.error(
            "Admin Get Bulk Orders Error:",
            e
        );

        return errorResponse(
            e?.message ||
            "Unable to fetch bulk orders."
        );
    }
}