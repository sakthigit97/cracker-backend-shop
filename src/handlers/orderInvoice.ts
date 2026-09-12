import {
    GetObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

import { verifyJwt } from "../utils/auth";
import { s3 } from "../utils/aws";

const BUCKET = process.env.BUCKET_NAME!;

export async function handler(
    event: APIGatewayProxyEventV2
) {
    try {
        verifyJwt(event);

        const orderId =
            event.pathParameters?.orderId;

        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Order Id is required.",
                }),
            };
        }

        const key = `invoices/${orderId}.pdf`;

        try {
            await s3.send(
                new HeadObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                })
            );
        } catch (error: any) {
            if (
                error?.name === "NotFound" ||
                error?.name === "NoSuchKey" ||
                error?.$metadata?.httpStatusCode === 404
            ) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        message: "Bill not found.",
                    }),
                };
            }

            throw error;
        }

        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ResponseContentType: "application/pdf", ResponseContentDisposition:
                `attachment; filename=bill-${orderId}.pdf`,
        });

        const url = await getSignedUrl(
            s3,
            command,
            {
                expiresIn: 300,
            }
        );

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
            body: JSON.stringify({
                url,
            }),
        };
    } catch (error: any) {
        console.error(
            "Invoice retrieval error:",
            error
        );

        if (
            error?.name === "NoSuchKey" ||
            error?.$metadata?.httpStatusCode === 404
        ) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: "Bill not found.",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    error?.message ||
                    "Unable to retrieve bill.",
            }),
        };
    }
}