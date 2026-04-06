import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { ProductRepository } from "../repo/product.repo";
import { getActiveDiscounts } from "./discount.service";
import { applyDiscount } from "./price.service";

const PRODUCT_TABLE = process.env.PRODUCTS_TABLE!;

export async function getActiveProducts(
    limit: number,
    lastKey?: any,
    search?: string
) {
    const searchLower = search?.toLowerCase();
    if (searchLower) {
        const params: any = {
            TableName: PRODUCT_TABLE,
            FilterExpression: "isActive = :true AND contains(#st, :q)",
            ExpressionAttributeNames: {
                "#st": "searchText",
            },
            ExpressionAttributeValues: {
                ":true": "true",
                ":q": searchLower,
            },
        };

        const res = await ddb.send(new ScanCommand(params));
        return {
            items: (res.Items || []).slice(0, limit),
            lastKey: res.LastEvaluatedKey,
        };
    }

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

    const res = await ddb.send(new QueryCommand(params));
    return {
        items: res.Items || [],
        lastKey: res.LastEvaluatedKey,
    };
}

// export async function getActiveProducts(
//     limit: number,
//     lastKey?: any,
//     search?: string
// ) {
//     const params: any = {
//         TableName: PRODUCT_TABLE,
//         IndexName: "isActive-index",
//         KeyConditionExpression: "isActive = :true",
//         ExpressionAttributeValues: {
//             ":true": "true",
//         },
//         Limit: limit,
//         ExclusiveStartKey: lastKey,
//     };

//     if (search) {
//         params.FilterExpression = "contains(#st, :q)";
//         params.ExpressionAttributeNames = {
//             "#st": "searchText",
//         };
//         params.ExpressionAttributeValues[":q"] = search;
//     }

//     const res = await ddb.send(new QueryCommand(params));
//     return {
//         items: res.Items || [],
//         lastKey: res.LastEvaluatedKey,
//     };
// }

export class ProductService {
    constructor(private repo = new ProductRepository()) { }

    async batchGetProducts(productIds: string[]) {
        const uniqueIds = [...new Set(productIds)];

        if (uniqueIds.length > 100) {
            throw new Error("Too many products requested");
        }
        const products = await this.repo.batchGet(uniqueIds);
        if (!products || products.length === 0) return [];
        const discounts = await getActiveDiscounts();
        const productMap = new Map(products.map(p => [p.productId, p]));

        return uniqueIds
            .map((id) => productMap.get(id))
            .filter((p): p is any => Boolean(p))
            .filter((p) => p.isActive === "true" || p.isActive === true)
            .map((p) => {
                const priceInfo = applyDiscount(p, discounts);
                return {
                    productId: p.productId,
                    name: p.name,
                    description: p.description ?? null,
                    image: p.imageUrls?.[0] ?? null,
                    price: priceInfo.price,
                    originalPrice:
                        priceInfo.originalPrice > priceInfo.price
                            ? priceInfo.originalPrice
                            : undefined,
                    discountText: priceInfo.discountText,
                    categoryId: p.categoryId,
                    brandId: p.brandId,
                    qty: p.quantity
                };
            });
    }

    async deleteProduct(productId: string) {
        return this.repo.deleteProduct(productId);
    }
}