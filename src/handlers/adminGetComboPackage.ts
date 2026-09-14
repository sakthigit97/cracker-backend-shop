import { verifyJwt } from "../utils/auth";
import { AdminGetComboPackageService } from "../services/adminGetComboPackage.service";

const service = new AdminGetComboPackageService();

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

        const result =
            await service.getComboPackage(comboId);

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
            "AdminGetComboPackage error",
            err
        );

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};