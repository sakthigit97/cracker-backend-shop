import {
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    TransactWriteCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import type { ChitMember, ChitScheme } from "../types/chit";

const CHITS_TABLE = process.env.CHITS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;

export class ChitRepository {
    async createScheme(scheme: ChitScheme) {
        await ddb.send(new PutCommand({
            TableName: CHITS_TABLE,
            Item: scheme,
            ConditionExpression: "attribute_not_exists(chitId)",
        }));
        return scheme;
    }

    async getScheme(chitId: string): Promise<ChitScheme | null> {
        const result = await ddb.send(new GetCommand({
            TableName: CHITS_TABLE,
            Key: { chitId, recordId: "SCHEME" },
        }));
        return (result.Item as ChitScheme | undefined) ?? null;
    }

    async listSchemes(): Promise<ChitScheme[]> {
        const schemes: ChitScheme[] = [];
        let exclusiveStartKey: Record<string, unknown> | undefined;
        do {
            const result = await ddb.send(new ScanCommand({
                TableName: CHITS_TABLE,
                FilterExpression: "entityType = :scheme",
                ExpressionAttributeValues: { ":scheme": "SCHEME" },
                ExclusiveStartKey: exclusiveStartKey,
            }));
            schemes.push(...(result.Items as ChitScheme[] ?? []));
            exclusiveStartKey = result.LastEvaluatedKey;
        } while (exclusiveStartKey);
        return schemes;
    }

    async getMember(chitId: string, userId: string): Promise<ChitMember | null> {
        const result = await ddb.send(new GetCommand({
            TableName: CHITS_TABLE,
            Key: { chitId, recordId: `MEMBER#${userId}` },
        }));
        return (result.Item as ChitMember | undefined) ?? null;
    }

    async createMember(member: ChitMember) {
        await ddb.send(new PutCommand({
            TableName: CHITS_TABLE,
            Item: member,
            ConditionExpression: "attribute_not_exists(chitId)",
        }));
        return member;
    }

    async listMembers(chitId: string): Promise<ChitMember[]> {
        const members: ChitMember[] = [];
        let exclusiveStartKey: Record<string, unknown> | undefined;
        do {
            const result = await ddb.send(new QueryCommand({
                TableName: CHITS_TABLE,
                KeyConditionExpression: "chitId = :chitId",
                FilterExpression: "entityType = :member",
                ExpressionAttributeValues: {
                    ":chitId": chitId,
                    ":member": "MEMBER",
                },
                ExclusiveStartKey: exclusiveStartKey,
            }));
            members.push(...(result.Items as ChitMember[] ?? []));
            exclusiveStartKey = result.LastEvaluatedKey;
        } while (exclusiveStartKey);
        return members;
    }

    async listMembersForUser(userId: string): Promise<ChitMember[]> {
        const members: ChitMember[] = [];
        let exclusiveStartKey: Record<string, unknown> | undefined;
        do {
            const result = await ddb.send(new QueryCommand({
                TableName: CHITS_TABLE,
                IndexName: "userId-schemeId-index",
                KeyConditionExpression: "userId = :userId",
                ExpressionAttributeValues: { ":userId": userId },
                ExclusiveStartKey: exclusiveStartKey,
            }));
            members.push(...(result.Items as ChitMember[] ?? []));
            exclusiveStartKey = result.LastEvaluatedKey;
        } while (exclusiveStartKey);
        return members;
    }

    async getUser(userId: string) {
        const result = await ddb.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { mobile: userId },
        }));
        return result.Item ?? null;
    }

    async updateMemberPayments(
        member: ChitMember,
        expectedVersion: number,
        payoutAmount?: number
    ) {
        const updateExpression =
            "SET installments = :installments, totalPaid = :totalPaid, " +
            "#version = :nextVersion, updatedAt = :updatedAt";
        const expressionAttributeNames = { "#version": "version" };
        const expressionAttributeValues = {
            ":installments": member.installments,
            ":totalPaid": member.totalPaid,
            ":nextVersion": expectedVersion + 1,
            ":expectedVersion": expectedVersion,
            ":updatedAt": member.updatedAt,
        };

        if (payoutAmount !== undefined) {
            await ddb.send(new TransactWriteCommand({
                TransactItems: [
                    {
                        Update: {
                            TableName: CHITS_TABLE,
                            Key: {
                                chitId: member.chitId,
                                recordId: member.recordId,
                            },
                            UpdateExpression: updateExpression,
                            ConditionExpression: "#version = :expectedVersion",
                            ExpressionAttributeNames: expressionAttributeNames,
                            ExpressionAttributeValues: expressionAttributeValues,
                        },
                    },
                    {
                        Update: {
                            TableName: USERS_TABLE,
                            Key: { mobile: member.userId },
                            UpdateExpression:
                                "SET #chitBalance = if_not_exists(#chitBalance, :zero) + :payoutAmount",
                            ConditionExpression: "attribute_exists(mobile)",
                            ExpressionAttributeNames: {
                                "#chitBalance": "chitBalance",
                            },
                            ExpressionAttributeValues: {
                                ":zero": 0,
                                ":payoutAmount": payoutAmount,
                            },
                        },
                    },
                ],
            }));
            return { ...member, version: expectedVersion + 1 };
        }

        await ddb.send(new UpdateCommand({
            TableName: CHITS_TABLE,
            Key: {
                chitId: member.chitId,
                recordId: member.recordId,
            },
            UpdateExpression: updateExpression,
            ConditionExpression: "#version = :expectedVersion",
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        }));
        return { ...member, version: expectedVersion + 1 };
    }

    async markMemberReminderSent(
        chitId: string,
        userId: string,
        sentAt: string
    ) {
        await ddb.send(new UpdateCommand({
            TableName: CHITS_TABLE,
            Key: { chitId, recordId: `MEMBER#${userId}` },
            UpdateExpression: "SET reminderSentAt = :sentAt",
            ConditionExpression: "attribute_not_exists(reminderSentAt)",
            ExpressionAttributeValues: { ":sentAt": sentAt },
        }));
    }
}
