import {
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";
import { BulkOrder } from "../types/bulkOrder";

const TABLE_NAME = process.env.BULK_ORDERS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const ADMIN_CONFIG_TABLE = process.env.ADMIN_CONFIG_TABLE!;
export class BulkOrderRepository {

    async create(order: BulkOrder): Promise<void> {

        await ddb.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: order,
            })
        );

    }

    async getById(orderId: string) {

        const res = await ddb.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    orderId,
                    meta: "ORDER",
                },
            })
        );

        return res.Item ?? null;

    }

    async getOrdersByUser(
        userId: string,
        limit: number,
        cursor?: any
    ) {

        const res = await ddb.send(
            new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: "userId-createdAt-index",
                KeyConditionExpression:
                    "userId = :userId",
                ExpressionAttributeValues: {
                    ":userId": userId,
                },
                ScanIndexForward: false,
                Limit: limit,
                ExclusiveStartKey: cursor,
            })
        );

        return {
            items: res.Items ?? [],
            nextCursor: res.LastEvaluatedKey ?? null,
        };

    }

    async updateStatus(
        orderId: string,
        data: {
            status: string;
            updatedAt: number;
            modifiedAt: number;
            modifiedBy: string;
            statusHistory: any[];
        }
    ) {

        await ddb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    orderId,
                    meta: "ORDER",
                },
                UpdateExpression: `
                    SET
                        #status = :status,
                        updatedAt = :updatedAt,
                        modifiedAt = :modifiedAt,
                        modifiedBy = :modifiedBy,
                        statusHistory = :statusHistory
                `,
                ExpressionAttributeNames: {
                    "#status": "status",
                },
                ExpressionAttributeValues: {
                    ":status": data.status,
                    ":updatedAt": data.updatedAt,
                    ":modifiedAt": data.modifiedAt,
                    ":modifiedBy": data.modifiedBy,
                    ":statusHistory": data.statusHistory,
                },
            })
        );

    }

    async getAdminConfig() {

        const res = await ddb.send(
            new GetCommand({
                TableName: ADMIN_CONFIG_TABLE,
                Key: {
                    configId: "global",
                },
            })
        );

        return res.Item ?? {};

    }

    async getUser(mobile: string) {

        const res = await ddb.send(
            new GetCommand({
                TableName: USERS_TABLE,
                Key: {
                    mobile,
                },
            })
        );
        return res.Item ?? null;
    }

    async getAdminOrders(
        limit: number,
        cursor?: any,
        status?: string
    ) {

        const params: any = {
            TableName: TABLE_NAME,
            IndexName: "meta-createdAt-index",
            KeyConditionExpression: "meta = :meta",
            ExpressionAttributeValues: {
                ":meta": "ORDER",
            },
            ScanIndexForward: false,
            Limit: limit,
            ExclusiveStartKey: cursor,
        };

        if (status) {
            params.FilterExpression = "#status = :status";
            params.ExpressionAttributeNames = {
                "#status": "status",
            };
            params.ExpressionAttributeValues[":status"] = status;
        }
        const res = await ddb.send(
            new QueryCommand(params)
        );
        return {
            items: res.Items ?? [],
            nextCursor: res.LastEvaluatedKey ?? null,
        };

    }
}