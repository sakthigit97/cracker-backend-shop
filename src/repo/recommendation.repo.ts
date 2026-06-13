import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const PRODUCT_TABLE = process.env.PRODUCTS_TABLE!;
export class RecommendationRepository {

    async getAllActiveProducts() {

        const products: any[] = [];
        let lastKey: any = undefined;

        do {

            const res = await ddb.send(
                new QueryCommand({
                    TableName: PRODUCT_TABLE,
                    IndexName: "isActive-index",
                    KeyConditionExpression: "isActive = :true",
                    ProjectionExpression:
                        "productId, price, quantity, categoryId, aiTags",
                    ExpressionAttributeValues: {
                        ":true": "true",
                    },
                    ExclusiveStartKey: lastKey,
                })
            );
            console.log(
                "AI ACTIVE PRODUCTS FETCHED",
                products.length
            );

            products.push(...(res.Items || []));
            lastKey = res.LastEvaluatedKey;

        } while (lastKey);
        console.log(
            "AI TOTAL ACTIVE PRODUCTS",
            products.length
        );
        return products;
    }
}