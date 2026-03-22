import {
    PutCommand,
    ScanCommand,
    GetCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";
import { randomUUID } from "crypto";

const TABLE = process.env.DISCOUNT_TABLE!;
export class AdminDiscountRepo {
    async listDiscounts() {
        const res = await ddb.send(
            new ScanCommand({
                TableName: TABLE,
            })
        );

        return res.Items || [];
    }

    async getDiscountById(discountId: string) {
        const res = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: { discountId },
            })
        );

        return res.Item || null;
    }

    async createDiscount(input: any) {
        const item = {
            discountId: `disc-${randomUUID()}`,
            discountMode: input.discountMode,
            discountType: input.discountType,
            discountValue: input.discountValue,
            priority: input.priority,
            targetId: input.targetId,
            isActive: input.isActive ?? true,
            createdAt: new Date().toISOString(),
        };

        await ddb.send(
            new PutCommand({
                TableName: TABLE,
                Item: item,
            })
        );
        return item;
    }

    async updateDiscount(
        discountId: string,
        input: {
            discountMode: string;
            discountValue: number;
            priority: number;
            isActive: boolean;
        }
    ) {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: { discountId },

                UpdateExpression: `
                SET discountMode = :m,
                    discountValue = :v,
                    priority = :p,
                    isActive = :a
            `,

                ExpressionAttributeValues: {
                    ":m": input.discountMode,
                    ":v": input.discountValue,
                    ":p": input.priority,
                    ":a": input.isActive,
                },
            })
        );

        return true;
    }

}