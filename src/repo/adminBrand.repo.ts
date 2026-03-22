import {
    PutCommand,
    ScanCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { randomUUID } from "crypto";

const TABLE = process.env.BRAND_TABLE!;

interface ListBrandInput {
    limit: number;
    cursor?: string;
    search?: string;
    isActive?: "" | "true" | "false";
}

export class AdminBrandRepository {
    async listBrands({ limit, cursor, search, isActive }: ListBrandInput) {
        const params: any = {
            TableName: TABLE,
            Limit: limit,
        };

        if (cursor) {
            params.ExclusiveStartKey = JSON.parse(
                Buffer.from(cursor, "base64").toString()
            );
        }

        if (isActive === "true" || isActive === "false") {
            params.FilterExpression = "isActive = :active";
            params.ExpressionAttributeValues = {
                ":active": isActive === "true",
            };
        }

        const res = await ddb.send(new ScanCommand(params));

        let items = res.Items || [];
        if (search) {
            const q = search.toLowerCase();
            items = items.filter((b: any) =>
                b.name?.toLowerCase().includes(q)
            );
        }

        return {
            items,
            nextCursor: res.LastEvaluatedKey
                ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString(
                    "base64"
                )
                : undefined,
        };
    }

    async getBrandById(brandId: string) {
        const res = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: { brandId },
            })
        );

        return res.Item || null;
    }

    async createBrand(input: {
        name: string;
        logoUrl: string;
        isActive: boolean;
    }) {
        const item = {
            brandId: `brand-${randomUUID()}`,
            name: input.name.trim(),
            logoUrl: input.logoUrl,
            isActive: input.isActive,
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

    async updateBrand(
        brandId: string,
        input: {
            name: string;
            logoUrl: string;
            isActive: boolean;
        }
    ) {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: { brandId },
                UpdateExpression :
                "SET #name = :n, logoUrl = :l, isActive = :a",
                ExpressionAttributeNames: {
                    "#name": "name",
                },
                ExpressionAttributeValues: {
                    ":n": input.name.trim(),
                    ":l": input.logoUrl,
                    ":a": input.isActive,
                },
            })
        );

        return true;
    }

    async updateBrandStatus(brandId: string, isActive: boolean) {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: { brandId },
                UpdateExpression: "SET isActive = :a",
                ExpressionAttributeValues: {
                    ":a": isActive,
                },
            })
        );

        return true;
    }

    async deleteBrand(brandId: string) {
        await ddb.send(
            new DeleteCommand({
                TableName: TABLE,
                Key: { brandId },
            })
        );

        return true;
    }
}