import { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyJwt } from "../utils/auth";
import { error as errorResponse, success } from "../libs/response";
import { getPresignedFlashSaleUpload } from "../utils/presign";

export const handler = async (
    event: APIGatewayProxyEventV2
) => {
    try {
        const auth = verifyJwt(event);

        if (auth.role !== "admin") {
            return errorResponse("Forbidden", 403);
        }

        const body = event.body
            ? JSON.parse(event.body)
            : {};

        const flashSaleId = String(
            body.flashSaleId || ""
        ).trim();

        const fileName = String(
            body.fileName || ""
        ).trim();

        const contentType = String(
            body.contentType || ""
        ).trim();

        if (!flashSaleId) {
            return errorResponse(
                "Flash sale ID is required.",
                400
            );
        }

        if (!fileName) {
            return errorResponse(
                "File name is required.",
                400
            );
        }

        if (!contentType.startsWith("image/")) {
            return errorResponse(
                "Only image files are allowed.",
                400
            );
        }

        const result =
            await getPresignedFlashSaleUpload(
                flashSaleId,
                {
                    name: fileName,
                    type: contentType,
                }
            );

        return success(result);
    } catch (err: any) {
        console.error(
            "Flash sale presign failed:",
            err
        );

        return errorResponse(
            err?.message ||
            "Unable to generate upload URL.",
            500
        );
    }
};