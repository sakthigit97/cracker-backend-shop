import { APIGatewayProxyEventV2 } from "aws-lambda";
import { success, error } from "../libs/response";
import { AdminCodeService } from "../services/adminCode.service";
import { verifyJwt } from "../utils/auth";

export async function create(
    event: APIGatewayProxyEventV2
) {
    try {

        const { userId, role } = verifyJwt(event);

        if (role !== "admin") {
            return error("Forbidden");
        }

        if (!event.body) {
            return error("Request body is required.");
        }

        const body = JSON.parse(event.body);

        const code = body.code?.trim();
        const requestUserId = body.userId?.trim();
        const schemeId = body.schemeId;
        const expiryDate = Number(body.expiryDate);

        if (
            !code ||
            !requestUserId ||
            !schemeId ||
            !expiryDate
        ) {
            return error(
                "Code, User, Scheme and Expiry Date are required."
            );
        }

        const response =
            await AdminCodeService.createCode({
                code,
                userId: requestUserId,
                schemeId,
                expiryDate,
                createdAt: Date.now(),
                createdBy: userId,
                status: "ACTIVE",
            });

        return success(response);

    } catch (e: any) {

        console.error(
            "Admin Code Creation Error:",
            e
        );

        return error(
            e.message ||
            "Unable to create admin code."
        );

    }
}

export async function list(
    event: APIGatewayProxyEventV2
) {
    try {

        const { role } =
            verifyJwt(event);

        if (role !== "admin") {
            return error("Forbidden");
        }

        const response =
            await AdminCodeService.listCodes();

        return success(response);

    } catch (e: any) {

        console.error(
            "Admin Code List Error:",
            e
        );

        return error(
            e.message ||
            "Unable to fetch admin codes."
        );

    }
}


export async function remove(
    event: APIGatewayProxyEventV2
) {
    try {

        const { role } =
            verifyJwt(event);

        if (role !== "admin") {
            return error("Forbidden");
        }

        const code =
            event.pathParameters?.code?.trim();

        if (!code) {
            return error(
                "Code is required."
            );
        }

        await AdminCodeService.deleteCode(
            code
        );

        return success({
            message:
                "Admin Code deleted successfully.",
        });

    } catch (e: any) {

        console.error(
            "Admin Code Delete Error:",
            e
        );

        return error(
            e.message ||
            "Unable to delete admin code."
        );

    }
}

export async function validate(
    event: APIGatewayProxyEventV2
) {
    try {
        if (!event.body) {
            return error(
                "Request body is required."
            );
        }

        const body = JSON.parse(
            event.body
        );

        const { userId } =
            verifyJwt(event);

        const code =
            body.code?.trim();

        const schemeId =
            body.schemeId?.trim();

        if (
            !userId ||
            !code ||
            !schemeId
        ) {
            return error(
                "User ID, Code and Scheme are required."
            );
        }

        const response =
            await AdminCodeService.validateCode(
                userId,
                code,
                schemeId
            );

        return success({
            valid: response.success,
            schemeId:
                response.schemeId,
        });
    } catch (e: any) {
        console.error(
            "Admin Code Validation Error:",
            e
        );

        return error(
            e.message ||
            "Invalid Admin Code."
        );
    }
}