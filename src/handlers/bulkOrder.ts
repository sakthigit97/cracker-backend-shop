import { verifyJwt } from "../utils/auth";
import { BulkOrderService } from "../services/bulkOrder.service";
import {
    success,
    error as errorResponse,
} from "../libs/response";
import {
    GetCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import type {
    APIGatewayProxyHandlerV2,
} from "aws-lambda";

const BULK_ORDERS_TABLE = process.env.BULK_ORDERS_TABLE!;

export const handler: APIGatewayProxyHandlerV2 =
    async (event) => {
        try {
            if (
                event.rawPath ===
                "/bulk-orders/restore"
            ) {
                return await restoreBulkOrder(
                    event
                );
            }

            const { userId } =
                verifyJwt(event);

            if (!event.body) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Request body is required.",
                    }),
                };
            }

            let body: any;

            try {
                body = JSON.parse(
                    event.body
                );
            } catch {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Invalid request body.",
                    }),
                };
            }

            const service =
                new BulkOrderService();

            const result =
                await service.createOrder(
                    userId,
                    body
                );

            return {
                statusCode: 201,
                body: JSON.stringify(
                    result
                ),
            };
        } catch (err: any) {
            console.error(
                "Create bulk order failed",
                err
            );

            const message =
                err?.message ||
                "Internal Server Error";

            const validationErrorMessages = [
                "Request body is required.",
                "Bulk scheme is required.",
                "Invalid bulk scheme selected.",
                "The selected bulk scheme is no longer active.",
                "Admin approval is required for the selected bulk scheme.",
                "Invalid Admin Code",
                "Admin Code has expired",
                "This Admin Code is no longer active.",
                "This Admin Code is not assigned to you",
                "This Admin Code is not valid for the selected bulk scheme.",
                "Delivery address is required.",
                "Full name is required.",
                "Please enter a valid full name.",
                "Mobile number is required.",
                "Please enter a valid mobile number.",
                "Address Line 1 is required.",
                "Please enter a valid address.",
                "City is required.",
                "State is required.",
                "Pincode is required.",
                "Please enter a valid pincode.",
                "Products are required.",
                "Please add at least one product.",
                "Invalid product.",
                "Duplicate products are not allowed.",
                "One or more selected products are unavailable.",
            ];

            const isValidationError =
                validationErrorMessages.includes(
                    message
                ) ||
                message.startsWith(
                    "Invalid quantity for product"
                ) ||
                message.startsWith(
                    "Carton quantity is not configured"
                ) ||
                message.startsWith(
                    "Bulk price is not configured"
                ) ||
                message.startsWith(
                    "Minimum order amount"
                );

            return {
                statusCode:
                    isValidationError
                        ? 400
                        : 500,
                body: JSON.stringify({
                    message,
                }),
            };
        }
    };

async function restoreBulkOrder(
    event: Parameters<
        APIGatewayProxyHandlerV2
    >[0]
) {
    try {
        const {
            userId,
            role,
        } = verifyJwt(event);

        if (!userId) {
            return errorResponse(
                "Unauthorized",
                401
            );
        }

        const username =
            role === "admin"
                ? "Admin"
                : `USER#${userId}`;

        let body: any;

        try {
            body = JSON.parse(
                event.body || "{}"
            );
        } catch {
            return errorResponse(
                "Invalid request body",
                400
            );
        }

        const {
            orderId,
        } = body;

        if (!orderId) {
            return errorResponse(
                "orderId is required",
                400
            );
        }

        /*
         * Get bulk order
         */
        const res = await ddb.send(
            new GetCommand({
                TableName:
                    BULK_ORDERS_TABLE,

                Key: {
                    orderId,
                    meta: "ORDER",
                },
            })
        );

        const order = res.Item;

        if (!order) {
            return errorResponse(
                "Bulk order not found",
                404
            );
        }

        /*
         * Only cancelled orders can be restored.
         */
        if (
            order.status !==
            "CANCELLED"
        ) {
            return errorResponse(
                "Only cancelled bulk orders can be restored",
                400
            );
        }

        /*
         * Restore is allowed only within
         * 30 days of cancellation.
         */
        const now = Date.now();

        const updatedAt =
            Number(
                order.updatedAt || 0
            );

        if (!updatedAt) {
            return errorResponse(
                "Bulk order cannot be restored because cancellation date is unavailable",
                400
            );
        }

        const diffDays =
            (now - updatedAt) /
            (1000 * 60 * 60 * 24);

        if (diffDays > 30) {
            return errorResponse(
                "Bulk order cannot be restored after 30 days",
                400
            );
        }

        /*
         * Append restore event to history.
         */
        const statusHistory = [
            ...(Array.isArray(
                order.statusHistory
            )
                ? order.statusHistory
                : []),

            {
                status:
                    "ORDER_PLACED",

                at: now,

                by: username,
            },
        ];

        /*
         * Restore only fields that belong
         * to the bulk-order schema.
         */
        await ddb.send(
            new UpdateCommand({
                TableName:
                    BULK_ORDERS_TABLE,

                Key: {
                    orderId,
                    meta: "ORDER",
                },

                UpdateExpression: `
                    SET
                        #status = :newStatus,
                        updatedAt = :now,
                        modifiedAt = :now,
                        modifiedBy = :modifiedBy,
                        statusHistory = :statusHistory
                `,

                /*
                 * Prevent restoring an order that
                 * has already been changed.
                 */
                ConditionExpression:
                    "#status = :expectedStatus",

                ExpressionAttributeNames: {
                    "#status": "status",
                },

                ExpressionAttributeValues: {
                    ":newStatus":
                        "ORDER_PLACED",

                    ":expectedStatus":
                        "CANCELLED",

                    ":now":
                        now,

                    ":modifiedBy":
                        username,

                    ":statusHistory":
                        statusHistory,
                },
            })
        );

        return success({
            message:
                "Bulk order restored successfully",
        });
    } catch (err: any) {
        console.error(
            "Restore bulk order failed",
            err
        );

        if (
            err?.name ===
            "ConditionalCheckFailedException"
        ) {
            return errorResponse(
                "Bulk order already modified",
                400
            );
        }

        return errorResponse(
            "Failed to restore bulk order",
            500
        );
    }
}