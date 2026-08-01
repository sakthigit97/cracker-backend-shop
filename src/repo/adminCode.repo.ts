import {
    DeleteCommand,
    GetCommand,
    PutCommand,
    ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { AdminCode } from "../types/adminCode";

const TABLE = process.env.ADMIN_CODES_TABLE!;
export class AdminCodeRepository {

    static async create(code: AdminCode) {

        await ddb.send(
            new PutCommand({
                TableName: TABLE,
                Item: code,
                ConditionExpression:
                    "attribute_not_exists(#code)",
                ExpressionAttributeNames: {
                    "#code": "code",
                },
            })
        );

        return code;

    }

    static async getByCode(
        code: string
    ): Promise<AdminCode | null> {

        const result = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: {
                    code,
                },
            })
        );

        return (result.Item as AdminCode) ?? null;
    }
    static async list(): Promise<AdminCode[]> {

        const result = await ddb.send(
            new ScanCommand({
                TableName: TABLE,
            })
        );

        return Array.isArray(result.Items)
            ? (result.Items as AdminCode[])
            : [];

    }
    static async delete(
        code: string
    ) {

        const existing =
            await this.getByCode(code);

        if (!existing) {

            throw new Error(
                "Admin Code not found."
            );

        }

        await ddb.send(
            new DeleteCommand({
                TableName: TABLE,
                Key: {
                    code,
                },
            })
        );

    }

}