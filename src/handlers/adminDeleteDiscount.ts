import { verifyJwt } from "../utils/auth";
import { ddb } from "../utils/dynamo";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

const TABLE = process.env.DISCOUNT_TABLE!;
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const discountId = event.pathParameters?.discountId;

        if (!discountId) {
            return { statusCode: 400, body: "discountId is required" };
        }
        await ddb.send(
            new DeleteCommand({
                TableName: TABLE,
                Key: {
                    discountId,
                },
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Discount deleted successfully",
            }),
        };
    } catch (err: any) {
        console.error("AdminDeleteDiscount error", err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: err?.message || "Internal Server Error",
            })
        };
    }
};