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
const PRODUCT_TABLE = process.env.PRODUCTS_TABLE!;

interface ListBrandInput {
    limit: number;
    cursor?: string;
    search?: string;
    isActive?: "" | "true" | "false";
}

export class AdminBrandRepository {

    async listBrands() {
        const items: any[] = [];

        let ExclusiveStartKey: any = undefined;

        do {
            const params: any = {
                TableName: TABLE,
            };

            if (ExclusiveStartKey) {
                params.ExclusiveStartKey =
                    ExclusiveStartKey;
            }

            const res =
                await ddb.send(
                    new ScanCommand(params)
                );

            items.push(
                ...(res.Items || [])
            );

            ExclusiveStartKey =
                res.LastEvaluatedKey;

        } while (ExclusiveStartKey);

        return {
            items,
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
                UpdateExpression:
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

    async hasProductsForBrand(brandId: string): Promise<boolean> {
        const res = await ddb.send(
            new ScanCommand({
                TableName: PRODUCT_TABLE,
                FilterExpression: "brandId = :b",
                ExpressionAttributeValues: {
                    ":b": brandId,
                },
                ProjectionExpression: "productId"
            })
        );
        return (res.Items?.length ?? 0) > 0;
    }
}