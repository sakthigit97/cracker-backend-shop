import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";
import { verifyJwt } from "../utils/auth";

const TABLE = process.env.CONTACT_TABLE!;

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const contactId = event.pathParameters?.contactId;

        await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: { contactId },
                UpdateExpression: "SET #status = :s",
                ExpressionAttributeNames: {
                    "#status": "status",
                },
                ExpressionAttributeValues: {
                    ":s": "CONTACTED",
                },
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };

    } catch (err: any) {
        console.error("UpdateContact error", err);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message || "Internal Server Error" }),
        };
    }
};