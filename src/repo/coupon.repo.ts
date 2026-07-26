import {
    DeleteCommand,
    GetCommand,
    PutCommand,
    ScanCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";
import { Coupon } from "../models/coupon.model";

const TABLE = process.env.COUPONS_TABLE!;
export class CouponRepository {

    async getCoupon(code: string) {

        const result = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: {
                    couponCode: code,
                },
            })
        );

        return result.Item as Coupon | undefined;
    }

    async createCoupon(coupon: Coupon) {

        await ddb.send(
            new PutCommand({
                TableName: TABLE,
                Item: coupon,
                ConditionExpression:
                    "attribute_not_exists(couponCode)",
            })
        );

        return coupon;
    }

    async listCoupons() {

        const result = await ddb.send(
            new ScanCommand({
                TableName: TABLE,
            })
        );

        return (result.Items ?? []) as Coupon[];
    }

    async deleteCoupon(couponCode: string) {
        await ddb.send(
            new DeleteCommand({
                TableName: TABLE,
                Key: {
                    couponCode,
                },
            })
        );
    }

}