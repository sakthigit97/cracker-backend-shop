import type { APIGatewayProxyEventV2 } from "aws-lambda";

import { verifyJwt } from "../utils/auth";
import { OrderService } from "../services/order.service";

const orderService = new OrderService();

export async function handler(
    event: APIGatewayProxyEventV2
) {
    try {
        const {
            userId,
            role,
        } = verifyJwt(event);
        if (
            role !== "admin" &&
            role !== "staff"
        ) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message: "Forbidden",
                }),
            };
        }

        const orderId =
            event.pathParameters?.orderId;

        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Order ID is required",
                }),
            };
        }

        const order =
            await orderService.refreshOrderAmount({
                orderId,
                userId,
                role,
            });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message:
                    "Order amount refreshed successfully",
                order,
            }),
        };
    } catch (error: any) {
        console.error(
            "Admin Refresh Order Amount Error:",
            error
        );

        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    error?.message ||
                    "Unable to refresh order amount",
            }),
        };
    }
}