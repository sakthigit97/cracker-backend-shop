import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { verifyJwt } from "../utils/auth";

const TABLE = process.env.CONTACT_TABLE!;

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const res = await ddb.send(
            new ScanCommand({
                TableName: TABLE,
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                items: res.Items || [],
            }),
        };

    } catch (err: any) {
        console.error("ListContact error", err);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message || "Internal Server Error" }),
        };
    }
};