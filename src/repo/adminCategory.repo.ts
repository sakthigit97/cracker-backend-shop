import { PutCommand, ScanCommand, UpdateCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { randomUUID } from "crypto";

const TABLE = process.env.CATEGORY_TABLE!;
const PRODUCT_TABLE = process.env.PRODUCTS_TABLE!;
interface ListCategoryInput {
    limit: number;
    cursor?: string;
    search?: string;
    isActive?: "true" | "false";
}

export class AdminCategoryRepository {
    async listCategories({
        limit,
        cursor,
        search,
        isActive,
    }: ListCategoryInput) {
        const params: any = {
            TableName: TABLE,
            Limit: limit,
        };

        if (cursor) {
            params.ExclusiveStartKey = JSON.parse(
                Buffer.from(cursor, "base64").toString()
            );
        }

        if (isActive === "true") {
            params.FilterExpression = "isActive = :isActive";
            params.ExpressionAttributeValues = {
                ":isActive": true,
            };
        }

        if (isActive === "false") {
            params.FilterExpression = "isActive = :isActive";
            params.ExpressionAttributeValues = {
                ":isActive": false,
            };
        }

        const res = await ddb.send(new ScanCommand(params));
        let items = res.Items || [];

        if (search) {
            const q = search.toLowerCase();
            items = items.filter((c: any) =>
                c.name?.toLowerCase().includes(q)
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

    async createCategory(input: {
        name: string;
        imageUrl?: string;
        sortOrder?: number;
        isActive: boolean;
    }) {
        const item = {
            categoryId: `cat-${randomUUID()}`,
            name: input.name.trim(),
            imageUrl: input.imageUrl || "",
            sortOrder: input.sortOrder ?? 0,
            isActive: input.isActive ? true : false,
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

    async updateCategoryStatus(categoryId: string, isActive: boolean) {
        const res = await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: {
                    categoryId,
                },
                UpdateExpression: "SET isActive = :val",
                ExpressionAttributeValues: {
                    ":val": isActive,
                },
                ReturnValues: "ALL_NEW",
            })
        );

        return res.Attributes;
    }

    async getCategoryById(categoryId: string) {
        const res = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: { categoryId },
            })
        );

        return res.Item || null;
    }

    async updateCategory(
        categoryId: string,
        input: {
            name: string;
            imageUrl: string;
            isActive: boolean;
        }
    ) {
        const res = await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: { categoryId },
                UpdateExpression: `
                SET #name = :name,
                    imageUrl = :imageUrl,
                    isActive = :isActive
            `,
                ExpressionAttributeNames: {
                    "#name": "name",
                },
                ExpressionAttributeValues: {
                    ":name": input.name,
                    ":imageUrl": input.imageUrl,
                    ":isActive": input.isActive,
                },
                ReturnValues: "ALL_NEW",
            })
        );

        return res.Attributes;
    }

    async deleteCategory(categoryId: string) {
        await ddb.send(
            new DeleteCommand({
                TableName: TABLE,
                Key: {
                    categoryId,
                },
            })
        );

        return true;
    }

    async hasProductsForCategory(categoryId: string): Promise<boolean> {
        const res = await ddb.send(
            new ScanCommand({
                TableName: PRODUCT_TABLE,
                FilterExpression: "categoryId = :c",
                ExpressionAttributeValues: {
                    ":c": categoryId,
                },
                ProjectionExpression: "productId",
            })
        );
        return (res.Items?.length ?? 0) > 0;
    }
}