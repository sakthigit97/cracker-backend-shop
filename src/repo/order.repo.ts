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
                    image: p.image || null,
                    originalPrice: p.originalPrice || null,
                    discountText: p.discountText || '',
                    isComboPackage: p.isComboPackage || false,
                },
            ])
        );

        const snapshot = cartItems.map((c) => {
            const product = map.get(c.itemId)!;
            return {
                productId: c.itemId,
                name: product.name,
                image: product.image,
                price: product.price,
                quantity: c.quantity,
                total: product.price * c.quantity,
                originalPrice: product.originalPrice,
                discountText: product.discountText,
                isComboPackage: product.isComboPackage,
            };
        });
        return snapshot;
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
                ConditionExpression: "walletCredit >= :amt",
                ExpressionAttributeValues: {
                    ":amt": usedAmount,
                },
            })
        );
    }

    async markReferralRewarded(mobile: string) {
        try {
            await ddb.send(
                new UpdateCommand({
                    TableName: "Users",
                    Key: { mobile },
                    UpdateExpression: "SET referralRewarded = :t",
                    ConditionExpression: "referralRewarded = :f",
                    ExpressionAttributeValues: {
                        ":t": true,
                        ":f": false,
                    },
                })
            );
            return true;
        } catch (err: any) {
            if (err.name === "ConditionalCheckFailedException") {
                return false;
            }
            throw err;
        }
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
                    totalProductAmount = :totalProductAmount,
                    nonComboProductTotal = :nonComboProductTotal,
                    comboPackageTotal = :comboPackageTotal,
                    couponCode = :couponCode,
                    couponType = :couponType,
                    couponValue = :couponValue,
                    couponDiscount = :couponDiscount,
                    packagingCharge = :packagingCharge,
                    amountBeforeDiscount = :amountBeforeDiscount,
                    amountAfterDiscount = :amountAfterDiscount,
                    gstAmount = :gstAmount,
                    grandTotal = :grandTotal,
                    walletUsed = :walletUsed,
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
                    ":totalProductAmount": data.totalProductAmount,
                    ":nonComboProductTotal": data.nonComboProductTotal,
                    ":comboPackageTotal": data.comboPackageTotal,
                    ":couponCode": data.couponCode ?? null,
                    ":couponType": data.couponType ?? null,
                    ":couponValue": data.couponValue ?? null,
                    ":couponDiscount": data.couponDiscount ?? 0,
                    ":packagingCharge": data.packagingCharge,
                    ":amountBeforeDiscount": data.amountBeforeDiscount,
                    ":amountAfterDiscount": data.amountAfterDiscount,
                    ":gstAmount": data.gstAmount,
                    ":grandTotal": data.grandTotal,
                    ":walletUsed": data.walletUsed,
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