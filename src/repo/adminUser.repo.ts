import {
    ScanCommand,
    DeleteCommand,
    UpdateCommand,
    GetCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";

const TABLE = process.env.USERS_TABLE!;
const MAX_SCAN_PAGES = 100;

export class AdminUserRepository {

    async listUsers({
        limit,
        cursor,
        search,
        isBulkUser
    }: {
        limit: number;
        cursor?: string;
        search?: string;
        isBulkUser?: boolean;
    }) {
        const searchValue = search?.trim().toLowerCase() || "";
        let exclusiveStartKey:
            | Record<string, any>
            | undefined;

        if (cursor) {
            exclusiveStartKey = JSON.parse(
                Buffer.from(
                    cursor,
                    "base64"
                ).toString("utf-8")
            );
        }

        const items: any[] = [];
        let lastEvaluatedKey = exclusiveStartKey;
        let scanCount = 0;

        do {
            scanCount++;

            const expressionAttributeNames: Record<
                string,
                string
            > = {};

            const expressionAttributeValues: Record<
                string,
                any
            > = {};

            let filterExpression:
                | string
                | undefined;

            if (searchValue) {
                expressionAttributeNames["#st"] =
                    "searchText";

                expressionAttributeValues[":q"] =
                    searchValue;

                filterExpression =
                    "contains(#st, :q)";
            }

            if (isBulkUser !== undefined) {
                expressionAttributeNames["#bulk"] =
                    "isBulkUser";

                expressionAttributeValues[":bulk"] =
                    isBulkUser;

                filterExpression = filterExpression
                    ? `${filterExpression} AND #bulk = :bulk`
                    : "#bulk = :bulk";
            }

            const response =
                await ddb.send(
                    new ScanCommand({
                        TableName: TABLE,

                        Limit: searchValue
                            ? Math.max(limit, 50)
                            : limit,

                        ExclusiveStartKey:
                            lastEvaluatedKey,

                        ...(filterExpression
                            ? {
                                FilterExpression:
                                    filterExpression,

                                ExpressionAttributeNames:
                                    expressionAttributeNames,

                                ExpressionAttributeValues:
                                    expressionAttributeValues,
                            }
                            : {}),
                    })
                );

            if (response.Items?.length) {
                items.push(
                    ...response.Items
                );
            }

            lastEvaluatedKey =
                response.LastEvaluatedKey;

            if (items.length >= limit) {
                break;
            }

            if (
                scanCount >=
                MAX_SCAN_PAGES
            ) {
                break;
            }

        } while (lastEvaluatedKey);

        const pageItems =
            items.slice(0, limit);

        const nextCursor =
            lastEvaluatedKey
                ? Buffer.from(
                    JSON.stringify(
                        lastEvaluatedKey
                    )
                ).toString("base64")
                : undefined;

        return {
            items: pageItems,
            nextCursor,
        };
    }

    async deleteUser(mobile: string) {
        await ddb.send(
            new DeleteCommand({
                TableName: TABLE,
                Key: {
                    mobile,
                },
            })
        );
    }

    async listUserMobiles() {
        const mobiles: string[] = [];

        let lastEvaluatedKey:
            | Record<string, any>
            | undefined;

        do {
            const response =
                await ddb.send(
                    new ScanCommand({
                        TableName: TABLE,

                        ProjectionExpression:
                            "mobile",

                        ExclusiveStartKey:
                            lastEvaluatedKey,
                    })
                );

            if (response.Items?.length) {
                mobiles.push(
                    ...response.Items
                        .map((item: any) =>
                            String(item.mobile)
                        )
                        .filter(Boolean)
                );
            }

            lastEvaluatedKey = response.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return mobiles;
    }

    async updateUser(
        mobile: string,
        input: {
            name?: string;
            role?: string;
            address?: string;
            city?: string;
            district?: string;
            state?: string;
            pincode?: string;
            walletCredit?: number;
            chitBalance?: number;
            isBulkUser?: boolean;
        }
    ) {
        const updates: string[] = [];
        const expressionAttributeNames: Record<
            string,
            string
        > = {};

        const expressionAttributeValues: Record<
            string,
            any
        > = {};

        if (input.name !== undefined) {
            updates.push(
                "#name = :name"
            );

            expressionAttributeNames[
                "#name"
            ] = "name";

            expressionAttributeValues[
                ":name"
            ] = input.name.trim();
        }

        if (input.role !== undefined) {
            updates.push(
                "#role = :role"
            );

            expressionAttributeNames[
                "#role"
            ] = "role";

            expressionAttributeValues[
                ":role"
            ] = input.role.trim();
        }

        if (input.address !== undefined) {
            updates.push(
                "#address = :address"
            );

            expressionAttributeNames[
                "#address"
            ] = "address";

            expressionAttributeValues[
                ":address"
            ] = input.address.trim();
        }

        if (input.city !== undefined) {
            updates.push(
                "#city = :city"
            );

            expressionAttributeNames[
                "#city"
            ] = "city";

            expressionAttributeValues[
                ":city"
            ] = input.city.trim();
        }

        if (input.district !== undefined) {
            updates.push(
                "#district = :district"
            );

            expressionAttributeNames[
                "#district"
            ] = "district";

            expressionAttributeValues[
                ":district"
            ] = input.district.trim();
        }

        if (input.state !== undefined) {
            updates.push(
                "#state = :state"
            );

            expressionAttributeNames[
                "#state"
            ] = "state";

            expressionAttributeValues[
                ":state"
            ] = input.state.trim();
        }

        if (input.pincode !== undefined) {
            updates.push(
                "#pincode = :pincode"
            );

            expressionAttributeNames[
                "#pincode"
            ] = "pincode";

            expressionAttributeValues[
                ":pincode"
            ] = input.pincode.trim();
        }


        if (input.walletCredit !== undefined) {
            updates.push(
                "#walletCredit = :walletCredit"
            );

            expressionAttributeNames[
                "#walletCredit"
            ] = "walletCredit";

            expressionAttributeValues[
                ":walletCredit"
            ] = input.walletCredit;
        }

        if (input.chitBalance !== undefined) {
            updates.push(
                "#chitBalance = :chitBalance"
            );

            expressionAttributeNames[
                "#chitBalance"
            ] = "chitBalance";

            expressionAttributeValues[
                ":chitBalance"
            ] = input.chitBalance;
        }

        if (input.isBulkUser !== undefined) {
            updates.push(
                "#isBulkUser = :isBulkUser"
            );

            expressionAttributeNames[
                "#isBulkUser"
            ] = "isBulkUser";

            expressionAttributeValues[
                ":isBulkUser"
            ] = input.isBulkUser;
        }

        if (updates.length === 0) {
            throw new Error(
                "At least one field is required"
            );
        }

        const result = await ddb.send(
            new UpdateCommand({
                TableName: TABLE,

                Key: {
                    mobile,
                },

                UpdateExpression:
                    `SET ${updates.join(", ")}`,

                ExpressionAttributeNames:
                    expressionAttributeNames,

                ExpressionAttributeValues:
                    expressionAttributeValues,

                ConditionExpression:
                    "attribute_exists(mobile)",

                ReturnValues: "ALL_NEW",
            })
        );

        return result.Attributes;
    }

    async setBulkUser(
        mobile: string,
        isBulkUser: boolean
    ) {
        const result = await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: {
                    mobile,
                },
                UpdateExpression: "SET #isBulkUser = :isBulkUser",
                ExpressionAttributeNames: {
                    "#isBulkUser": "isBulkUser",
                },
                ExpressionAttributeValues: {
                    ":isBulkUser": isBulkUser,
                },
                ConditionExpression: "attribute_exists(mobile)",
            })
        );
        return result.Attributes;
    }

    async getUserByMobile(mobile: string) {
        const result = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: {
                    mobile,
                },
            })
        );

        return result.Item ?? null;
    }
}