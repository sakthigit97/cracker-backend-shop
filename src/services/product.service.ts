import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { ProductRepository } from "../repo/product.repo";

const PRODUCT_TABLE = process.env.PRODUCTS_TABLE!;
export async function getActiveProducts(
    limit: number,
    lastKey?: any,
    search?: string
) {
    const params: any = {
        TableName: PRODUCT_TABLE,
        IndexName: "isActive-index",
        KeyConditionExpression: "isActive = :true",
        ExpressionAttributeValues: {
            ":true": "true",
        },
        Limit: limit,
        ExclusiveStartKey: lastKey,
    };

    if (search) {
        params.FilterExpression = "contains(#st, :q)";
        params.ExpressionAttributeNames = {
            "#st": "searchText",
        };
        params.ExpressionAttributeValues[":q"] = search;
    }

    const res = await ddb.send(new QueryCommand(params));
    return {
        items: res.Items || [],
        lastKey: res.LastEvaluatedKey,
    };
}

export class ProductService {
    constructor(private repo = new ProductRepository()) { }

    async batchGetProducts(productIds: string[]) {
        const uniqueIds = [...new Set(productIds)];

        if (uniqueIds.length > 100) {
            throw new Error("Too many products requested");
        }

        return this.repo.batchGet(uniqueIds);
    }

    async deleteProduct(productId: string) {
        return this.repo.deleteProduct(productId);
    }
}