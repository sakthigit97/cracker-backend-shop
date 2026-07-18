import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { AiProduct } from "../types/aiRecommendation.types";

const PRODUCT_TABLE = process.env.PRODUCTS_TABLE!;
export class RecommendationRepository {

    async getAllActiveProducts(): Promise<AiProduct[]> {
        const products: AiProduct[] = [];
        let lastKey: any;
        do {

            const res = await ddb.send(
                new QueryCommand({
                    TableName: PRODUCT_TABLE,
                    IndexName: "isActive-index",
                    KeyConditionExpression: "isActive = :true",
                    ProjectionExpression: "productId, price, quantity, categoryId, brandId, aiTags",
                    ExpressionAttributeValues: {
                        ":true": "true",
                    },
                    ExclusiveStartKey: lastKey,
                })
            );

            products.push(...((res.Items ?? []) as AiProduct[]));
            console.log(
                "AI ACTIVE PRODUCTS FETCHED",
                products.length
            );
            lastKey = res.LastEvaluatedKey;

        } while (lastKey);

        console.log(
            "AI TOTAL ACTIVE PRODUCTS",
            products.length
        );
        return products;
    }
}