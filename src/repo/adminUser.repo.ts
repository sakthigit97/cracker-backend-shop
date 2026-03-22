import { ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.USERS_TABLE!;
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
        const params: any = {
            TableName: TABLE,
            Limit: limit,
        };

        if (cursor) {
            params.ExclusiveStartKey = JSON.parse(
                Buffer.from(cursor, "base64").toString()
            );
        }

        const res = await ddb.send(new ScanCommand(params));

        let items = res.Items || [];
        if (search?.trim()) {
            const q = search.toLowerCase();

            items = items.filter((u: any) => {
                const nameMatch =
                    u.name?.toLowerCase().includes(q);

                const mobileMatch =
                    u.mobile &&
                    String(u.mobile).includes(q);

                return nameMatch || mobileMatch;
            });
        }

        return {
            items,
            nextCursor: res.LastEvaluatedKey
                ? Buffer.from(
                    JSON.stringify(res.LastEvaluatedKey)
                ).toString("base64")
                : undefined,
        };
    }

    async deleteUser(mobile: string) {
        await ddb.send(
            new DeleteCommand({
                TableName: TABLE,
                Key: { mobile },
            })
        );
    }
}