import {
    PutCommand,
    QueryCommand,
    UpdateCommand,
    GetCommand,
    ScanCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";
import { ProductService } from "../services/product.service";

const TABLE_NAME = process.env.ORDERS_TABLE || "Orders";

export class OrderRepository {
    private productService = new ProductService();

    async buildItemsSnapshot(cartItems: { itemId: string; quantity: number }[]) {
        const productIds = cartItems.map((c) => c.itemId);

        const products = await this.productService.batchGetProducts(productIds);

        const map = new Map(
            products.map((p: any) => [
                p.productId,
                {
                    name: p.name,
                    price: p.price,
                    image:
                        Array.isArray(p.imageUrls) && p.imageUrls.length > 0
                            ? p.imageUrls[0]
                            : null,
                },
            ])
        );

        return cartItems.map((c) => {
            const product = map.get(c.itemId);

            if (!product) {
                throw new Error(`Product not found or inactive: ${c.itemId}`);
            }

            return {
                productId: c.itemId,
                name: product.name,
                price: product.price,
                image: product.image || null,
                quantity: c.quantity,
                total: product.price * c.quantity,
            };
        });
    }

    async create(order: any) {
        await ddb.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: order,
            })
        );
    }

    async getOrdersByUser(userId: string, limit: number, cursor?: any) {
        const res = await ddb.send(
            new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: "userId-createdAt-index",
                KeyConditionExpression: "userId = :uid",
                ExpressionAttributeValues: {
                    ":uid": userId,
                },
                ScanIndexForward: false,
                Limit: limit,
                ExclusiveStartKey: cursor,
            })
        );

        return {
            items: res.Items || [],
            nextCursor: res.LastEvaluatedKey || null,
        };
    }

    async getById(orderId: string) {
        const res = await ddb.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    orderId,
                    meta: "ORDER",
                },
            })
        );

        return res.Item;
    }

    async updateStatus(orderId: string, data: any) {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    orderId,
                    meta: "ORDER",
                },
                UpdateExpression: `
                SET 
                    #status = :status,
                    updatedAt = :updatedAt,
                    modifiedAt = :modifiedAt,
                    modifiedBy = :modifiedBy,
                    statusHistory = :statusHistory
                `,
                ExpressionAttributeNames: {
                    "#status": "status",
                },
                ExpressionAttributeValues: {
                    ":status": data.status,
                    ":updatedAt": data.updatedAt,
                    ":modifiedAt": data.modifiedAt,
                    ":modifiedBy": data.modifiedBy,
                    ":statusHistory": data.statusHistory,
                },
            })
        );
    }

    async getUserByMobile(mobile: string) {
        const res = await ddb.send(
            new GetCommand({
                TableName: "Users",
                Key: { mobile },
            })
        );

        return res.Item || null;
    }

    async deductWalletCredit(mobile: string, usedAmount: number) {
        if (usedAmount <= 0) return;

        await ddb.send(
            new UpdateCommand({
                TableName: "Users",
                Key: { mobile },
                UpdateExpression: "SET walletCredit = walletCredit - :amt",
                ExpressionAttributeValues: {
                    ":amt": usedAmount,
                },
            })
        );
    }

    async markReferralRewarded(mobile: string) {
        await ddb.send(
            new UpdateCommand({
                TableName: "Users",
                Key: { mobile },
                UpdateExpression: "SET referralRewarded = :t",
                ExpressionAttributeValues: {
                    ":t": true,
                },
            })
        );
    }

    async addWalletCreditByReferralCode(referralCode: string, amount: number) {
        if (!referralCode || amount <= 0) return;
        const scanRes = await ddb.send(
            new ScanCommand({
                TableName: "Users",
                FilterExpression: "referralCode = :c",
                ExpressionAttributeValues: {
                    ":c": referralCode,
                },
                Limit: 1,
            })
        );

        const refUser = scanRes.Items?.[0];
        if (!refUser) return;

        await ddb.send(
            new UpdateCommand({
                TableName: "Users",
                Key: { mobile: refUser.mobile },
                UpdateExpression: "SET walletCredit = if_not_exists(walletCredit, :z) + :amt",
                ExpressionAttributeValues: {
                    ":amt": amount,
                    ":z": 0,
                },
            })
        );
    }

    async getAdminConfig() {
        const res = await ddb.send(
            new GetCommand({
                TableName: "AdminConfig",
                Key: {
                    configId: "global",
                },
            })
        );

        return res.Item || {};
    }

    async updateItems(orderId: string, data: any) {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    orderId,
                    meta: "ORDER",
                },
                UpdateExpression: `
                SET 
                    #items = :items,
                    subtotal = :subtotal,
                    totalAmount = :totalAmount,
                    finalPayable = :finalPayable,
                    updatedAt = :updatedAt,
                    modifiedAt = :modifiedAt,
                    modifiedBy = :modifiedBy,
                    statusHistory = :statusHistory
            `,
                ExpressionAttributeNames: {
                    "#items": "items",
                },
                ExpressionAttributeValues: {
                    ":items": data.items,
                    ":subtotal": data.subtotal,
                    ":totalAmount": data.totalAmount,
                    ":finalPayable": data.finalPayable,
                    ":updatedAt": data.updatedAt,
                    ":modifiedAt": data.modifiedAt,
                    ":modifiedBy": data.modifiedBy,
                    ":statusHistory": data.statusHistory,
                },
            })
        );
    }
}