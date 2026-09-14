import { verifyJwt } from "../utils/auth";
import { AdminUpdateComboPackageService } from "../services/adminUpdateComboPackage.service";

const service =
    new AdminUpdateComboPackageService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const comboId =
            event.pathParameters?.comboId;

        if (!comboId) {
            return {
                statusCode: 400,
                body: "comboId is required",
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                body: "Request body required",
            };
        }

        const body = JSON.parse(
            event.body
        );

        const { productIds } = body;

        if (
            !Array.isArray(productIds) ||
            productIds.length === 0
        ) {
            return {
                statusCode: 400,
                body: "At least one product is required",
            };
        }

        const result =
            await service.updateComboPackage(
                comboId,
                productIds
            );

        if (!result) {
            return {
                statusCode: 404,
                body: "Combo package not found",
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(result),
        };
    } catch (err: any) {
        console.error(
            "AdminUpdateComboPackage error",
            err
        );

        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    err?.message ||
                    "Internal Server Error",
            }),
        };
    }
};