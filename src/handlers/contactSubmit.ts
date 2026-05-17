import { randomUUID } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.CONTACT_TABLE!;

export const handler = async (event: any) => {
    try {
        const body = JSON.parse(event.body || "{}");

        const { name, phone, email, message } = body;

        if (!name || !phone) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Name and phone required" }),
            };
        }

        const item = {
            contactId: `contact-${randomUUID()}`,
            name,
            phone,
            email: email || "",
            message: message || "",
            status: "NEW",
            createdAt: new Date().toISOString(),
        };

        await ddb.send(
            new PutCommand({
                TableName: TABLE,
                Item: item,
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };

    } catch (err: any) {
        console.error("ContactUs error", err);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message || "Internel Server Error" }),
        };
    }
};