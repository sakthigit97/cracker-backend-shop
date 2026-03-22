import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.ADMIN_CONFIG_TABLE!;

export type AdminConfigItem = {
    configId: string;
    [key: string]: any;
};

export class AdminConfigRepo {
    async getGlobalConfig(): Promise<AdminConfigItem | null> {
        const result = await docClient.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: { configId: "global" },
            })
        );

        return result.Item as AdminConfigItem | null;
    }

    async updateGlobalConfig(payload: Record<string, any>) {
        const existing = await this.getGlobalConfig();

        const updatedItem: AdminConfigItem = {
            ...(existing || {}),
            ...payload,

            configId: "global",
            updatedAt: new Date().toISOString(),
        };

        await docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: updatedItem,
            })
        );

        return updatedItem;
    }
}