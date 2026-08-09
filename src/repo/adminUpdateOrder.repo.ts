import { UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.ORDERS_TABLE!;
export class AdminUpdateOrderRepository {
    async getOrderById(orderId: string) {
        const res = await ddb.send(
            new QueryCommand({
                TableName: TABLE,
                KeyConditionExpression: "orderId = :oid",
                ExpressionAttributeValues: {
                    ":oid": orderId,
                },
                Limit: 1,
            })
        );
        return res.Items?.[0] || null;
    }

    async updateOrder(input: {
        orderId: string;
        status?: string;
        adminComment?: string;
        adminId: string;
        previousStatus: string;
    }) {
        const updates: string[] = [];

        const values: Record<string, any> = {
            ":now": Date.now(),
            ":by": `ADMIN#${input.adminId}`,
            ":cancelled": "CANCELLED",
            ":dispatched": "DISPATCHED",
            ":emptyHistory": [],
            ":history": [
                {
                    fromStatus: input.previousStatus,
                    toStatus: input.status ?? input.previousStatus,
                    comment: input.adminComment ?? "",
                    changedBy: `ADMIN#${input.adminId}`,
                    changedAt: Date.now(),
                },
            ],
        };

        const names: Record<string, string> = {
            "#status": "status",
        };

        if (input.status) {
            updates.push("#status = :status");
            values[":status"] = input.status;

            if (input.status === "PAYMENT_CONFIRMED") {
                updates.push("paymentStatus = :success");
                values[":success"] = "SUCCESS";
            }
        }

        if (input.adminComment !== undefined) {
            updates.push("adminComment = :comment");
            values[":comment"] = input.adminComment;
        }

        const hasStatusChange = input.status !== undefined &&
            input.status !== input.previousStatus;

        const hasCommentChange =
            input.adminComment !== undefined;

        if (hasStatusChange || hasCommentChange) {
            values[":history"] = [
                {
                    action: hasStatusChange
                        ? "STATUS_UPDATED"
                        : "COMMENT_UPDATED",
                    fromStatus: input.previousStatus,
                    toStatus: input.status ?? input.previousStatus,
                    comment: input.adminComment ?? "",
                    changedBy: `ADMIN#${input.adminId}`,
                    changedAt: values[":now"],
                },
            ];

            updates.push(
                "statusHistory = list_append(if_not_exists(statusHistory, :emptyHistory), :history)"
            );
        }

        updates.push("modifiedAt = :now");
        updates.push("modifiedBy = :by");

        const res = await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: {
                    orderId: input.orderId,
                    meta: "ORDER",
                },
                UpdateExpression: `SET ${updates.join(", ")}`,
                ConditionExpression:
                    "#status <> :cancelled AND #status <> :dispatched",
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
                ReturnValues: "ALL_NEW",
            })
        );

        return res.Attributes;
    }
}