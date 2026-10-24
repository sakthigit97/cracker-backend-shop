import { verifyJwt } from "../utils/auth";
import { AdminUpdateComboPackageService } from "../services/adminUpdateComboPackage.service";

const service =
    new AdminUpdateComboPackageService();

export const handler = async (
    event: any
) => {
    try {
        const { role } =
            verifyJwt(event);

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

        const result =
            await service.deleteComboPackage(
                comboId
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
                "Content-Type":
                    "application/json",
            },
            body: JSON.stringify(result),
        };
    } catch (err: any) {
        console.error(
            "AdminDeleteComboPackage error",
            err
        );

        return {
            statusCode: 500,
            headers: {
                "Content-Type":
                    "application/json",
            },
            body: JSON.stringify({
                message:
                    err?.message ||
                    "Internal Server Error",
            }),
        };
    }
};