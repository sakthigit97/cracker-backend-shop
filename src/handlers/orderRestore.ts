import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { success, error } from "../libs/response";
import { verifyJwt } from "../utils/auth";

const ORDER_TABLE = process.env.ORDERS_TABLE!;
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {

        const decoded = verifyJwt(event);
        const userId = decoded.userId;
        if (!userId) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: "Unauthorized",
                }),
            };
        }

        const body = JSON.parse(event.body || "{}");
        const { orderId } = body;

        if (!orderId) {
            return error("orderId is required", 400);
        }

        const res = await ddb.send(
            new GetCommand({
                TableName: ORDER_TABLE,
                Key: { orderId, meta: "ORDER", },
            })
        );

        const order = res.Item;
        if (!order) {
            return error("Order not found", 404);
        }

        if (order.status !== "CANCELLED") {
            return error("Only cancelled orders can be restored", 400);
        }

        const now = Date.now();
        const updatedAt = Number(order.updatedAt);

        const diffDays = (now - updatedAt) / (1000 * 60 * 60 * 24);

        if (diffDays > 30) {
            return error("Order cannot be restored after 30 days", 400);
        }
        const sevenDaysLater = now + (7 * 24 * 60 * 60 * 1000);

        await ddb.send(
            new UpdateCommand({
                TableName: ORDER_TABLE,
                Key: { orderId, meta: "ORDER", },
                UpdateExpression: "SET #status = :newStatus, updatedAt = :now, expectedDelivery = :delivery",
                ConditionExpression: "#status = :expectedStatus",
                ExpressionAttributeNames: {
                    "#status": "status",
                },
                ExpressionAttributeValues: {
                    ":newStatus": "ORDER_PLACED",
                    ":expectedStatus": "CANCELLED",
                    ":now": now,
                    ":delivery": sevenDaysLater,
                },
            })
        );

        return success({
            message: "Order restored successfully",
        });
    } catch (err: any) {
        console.error("restore order error:", err);

        if (err.name === "ConditionalCheckFailedException") {
            return error("Order already modified", 400);
        }

        return error("Failed to restore order", 500);
    }
};