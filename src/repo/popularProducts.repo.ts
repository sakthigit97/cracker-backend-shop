import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { ProductService } from "../services/product.service";

const ORDERS_TABLE = process.env.ORDERS_TABLE!;

export class PopularProductsRepository {
  private productService = new ProductService();

  async getPopularProducts(limit: number) {
    let lastKey: any = undefined;
    const productCount: Record<string, number> = {};

    do {
      const res = await ddb.send(
        new QueryCommand({
          TableName: ORDERS_TABLE,
          IndexName: "status-meta-index",
          KeyConditionExpression: "#status = :s AND #meta = :m",
          ExpressionAttributeNames: {
            "#status": "status",
            "#meta": "meta",
          },
          ExpressionAttributeValues: {
            ":s": "DISPATCHED",
            ":m": "ORDER",
          },
          Limit: 50,
          ExclusiveStartKey: lastKey,
        })
      );

      const orders = res.Items || [];

      for (const order of orders) {
        const items = order.items || [];

        for (const item of items) {
          const productId = item.productId;
          const qty = Number(item.quantity || 1);

          if (!productId) continue;

          productCount[productId] =
            (productCount[productId] || 0) + qty;
        }
      }

      lastKey = res.LastEvaluatedKey;

    } while (lastKey);

    const topProductIds = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([productId]) => productId);

    if (topProductIds.length === 0) {
      return { items: [] };
    }

    const products = await this.productService.batchGetProducts(topProductIds);

    return {
      items: products,
    };
  }
}