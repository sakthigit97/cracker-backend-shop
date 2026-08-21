import {
    ScanCommand,
    DeleteCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";

const TABLE = process.env.USERS_TABLE!;
const MAX_SCAN_PAGES = 100;

export class AdminUserRepository {

    async listUsers({
        limit,
        cursor,
        search,
    }: {
        limit: number;
        cursor?: string;
        search?: string;
    }) {
        const searchValue =
            search?.trim().toLowerCase() || "";

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

        let lastEvaluatedKey =
            exclusiveStartKey;

        let scanCount = 0;

        do {
            scanCount++;

            const expressionAttributeNames: Record<
                string,
                string
            > = {};

            const expressionAttributeValues: Record<
                string,
                string
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
            state?: string;
            pincode?: string;
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

        /*
         * Name
         */
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

        /*
         * Role
         */
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

        /*
         * Address
         */
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

        /*
         * City
         */
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

        /*
         * State
         */
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
}