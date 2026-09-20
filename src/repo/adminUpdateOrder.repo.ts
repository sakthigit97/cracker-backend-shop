import {
    UpdateCommand,
    QueryCommand,
    TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";

const TABLE = process.env.ORDERS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;

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
        paymentAccountId?: string;
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

                updates.push("paymentAccountId = :paymentAccountId");
                values[":paymentAccountId"] = input.paymentAccountId;
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

    async updateOrderAddress(input: {
        orderId: string;
        address: {
            fullName: string;
            mobile: string;
            addressLine1: string;
            addressLine2?: string;
            city: string;
            district?: string;
            state: string;
            pincode: string;
        };
        adminId: string;
    }) {
        const now = Date.now();

        const address = [
            input.address.fullName.trim(),
            input.address.mobile.trim(),
            input.address.addressLine1.trim(),
            input.address.addressLine2?.trim(),
            `${input.address.city.trim()}, ${input.address.district?.trim() || ""}, ${input.address.state.trim()} - ${input.address.pincode.trim()}`,
        ]
            .filter(Boolean)
            .join("\n");

        const res = await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: {
                    orderId: input.orderId,
                    meta: "ORDER",
                },
                UpdateExpression:
                    "SET address = :address, modifiedAt = :now, modifiedBy = :by",
                ConditionExpression:
                    "#status <> :cancelled AND #status <> :dispatched",
                ExpressionAttributeNames: {
                    "#status": "status",
                },
                ExpressionAttributeValues: {
                    ":address": address,
                    ":now": now,
                    ":by": `ADMIN#${input.adminId}`,
                    ":cancelled": "CANCELLED",
                    ":dispatched": "DISPATCHED",
                },
                ReturnValues: "ALL_NEW",
            })
        );

        return res.Attributes;
    }

    async applyChitBalance(input: {
        orderId: string;
        userId: string;
        chitAmount: number;
        finalPayable: number;
        expectedFinalPayable: number;
        adminId: string;
    }) {
        const now = Date.now();

        await ddb.send(
            new TransactWriteCommand({
                TransactItems: [
                    {
                        Update: {
                            TableName: TABLE,

                            Key: {
                                orderId: input.orderId,
                                meta: "ORDER",
                            },

                            UpdateExpression:
                                "SET finalPayable = :finalPayable, " +
                                "chitAmount = :chitAmount, " +
                                "modifiedAt = :now, " +
                                "modifiedBy = :by",

                            ConditionExpression:
                                "#status <> :cancelled " +
                                "AND #status <> :dispatched " +
                                "AND (attribute_not_exists(chitAmount) OR chitAmount = :zero) " +
                                "AND finalPayable = :expectedFinalPayable",

                            ExpressionAttributeNames: {
                                "#status": "status",
                            },

                            ExpressionAttributeValues: {
                                ":finalPayable": input.finalPayable,
                                ":chitAmount": input.chitAmount,
                                ":expectedFinalPayable":
                                    input.expectedFinalPayable,
                                ":now": now,
                                ":by": `ADMIN#${input.adminId}`,
                                ":cancelled": "CANCELLED",
                                ":dispatched": "DISPATCHED",
                                ":zero": 0,
                            },
                        },
                    },

                    {
                        Update: {
                            TableName: USERS_TABLE,

                            Key: {
                                mobile: input.userId,
                            },

                            UpdateExpression:
                                "SET chitBalance = chitBalance - :chitAmount",

                            ConditionExpression:
                                "attribute_exists(mobile) " +
                                "AND chitBalance >= :chitAmount",

                            ExpressionAttributeValues: {
                                ":chitAmount": input.chitAmount,
                            },
                        },
                    },
                ],
            })
        );

        return await this.getOrderById(input.orderId);
    }

}