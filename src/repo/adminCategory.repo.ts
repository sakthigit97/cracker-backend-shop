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

        let items: any[] = [];
        let lastEvaluatedKey: any = cursor
            ? JSON.parse(Buffer.from(cursor, "base64").toString())
            : undefined;

        do {
            const params: any = {
                TableName: TABLE,
                ExclusiveStartKey: lastEvaluatedKey,
            };

            const res = await ddb.send(new ScanCommand(params));

            items.push(...(res.Items ?? []));

            lastEvaluatedKey = res.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        if (isActive === "true") {
            items = items.filter(c => c.isActive === true);
        }

        if (isActive === "false") {
            items = items.filter(c => c.isActive === false);
        }

        if (search) {
            const q = search.toLowerCase();
            items = items.filter((c: any) =>
                c.name?.toLowerCase().includes(q)
            );
        }

        items.sort(
            (a: any, b: any) =>
                Number(a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
                Number(b.sortOrder ?? Number.MAX_SAFE_INTEGER)
        );

        return {
            items,
            nextCursor: undefined,
        };
    }

    async createCategory(input: {
        name: string;
        imageUrl?: string;
        sortOrder?: number;
        isActive: boolean;
    }) {
        const nextSortOrder = await this.getNextSortOrder();
        const item = {
            categoryId: `cat-${randomUUID()}`,
            name: input.name.trim(),
            imageUrl: input.imageUrl || "",
            sortOrder: nextSortOrder,
            isActive: !!input.isActive,
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

    private async getNextSortOrder(): Promise<number> {

        let items: any[] = [];
        let lastEvaluatedKey: any;

        do {
            const res = await ddb.send(
                new ScanCommand({
                    TableName: TABLE,
                    ProjectionExpression: "sortOrder",
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            );

            items.push(...(res.Items ?? []));
            lastEvaluatedKey = res.LastEvaluatedKey;

        } while (lastEvaluatedKey);

        const maxSortOrder = Math.max(
            0,
            ...items.map((x: any) => Number(x.sortOrder ?? 0))
        );

        return maxSortOrder + 1;
    }
}