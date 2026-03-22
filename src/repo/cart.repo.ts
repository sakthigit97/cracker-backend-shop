import {
    QueryCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE_NAME = process.env.CART_TABLE!;

export class CartRepository {
    async getCart(cartId: string) {
        const res = await ddb.send(
            new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "cartId = :cid",
                ExpressionAttributeValues: {
                    ":cid": cartId,
                },
            })
        );

        return (res.Items ?? []) as {
            itemId: string;
            quantity: number;
        }[];
    }

    async addItem(
        cartId: string,
        productId: string,
        qty: number
    ) {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    cartId,
                    itemId: productId,
                },
                UpdateExpression:
                    "SET quantity = if_not_exists(quantity, :zero) + :qty",
                ExpressionAttributeValues: {
                    ":qty": qty,
                    ":zero": 0,
                },
            })
        );
    }

    async removeItem(
        cartId: string,
        productId: string
    ) {
        await ddb.send(
            new DeleteCommand({
                TableName: TABLE_NAME,
                Key: {
                    cartId,
                    itemId: productId,
                },
            })
        );
    }

    async clearCart(cartId: string) {
        const items = await this.getCart(cartId);

        for (const item of items) {
            await this.removeItem(cartId, item.itemId);
        }
    }

    async setItemQuantity(cartId: string, productId: string, qty: number) {
        await ddb.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    cartId,
                    itemId: productId,
                    quantity: qty,
                },
            })
        );
    }
}