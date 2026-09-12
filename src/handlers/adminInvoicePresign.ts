import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { getPresignedInvoiceUpload } from "../utils/presign";
import { success, error } from "../libs/response";

export async function handler(event: APIGatewayProxyEventV2) {
    try {
        const { role } = verifyJwt(event);

        if (role === "user") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const orderId = event.pathParameters?.orderId;
        if (!orderId) {
            return error("Order Id is required.");
        }

        const result = await getPresignedInvoiceUpload(orderId);
        return success(result);
    } catch (e: any) {
        console.error(
            "Admin Invoice Presign Error:",
            e
        );

        return error(
            e.message ||
            "Unable to generate invoice upload URL."
        );
    }
}