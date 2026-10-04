import { verifyJwt } from "../utils/auth";
import { AdminGetComboPackagesService } from "../services/adminGetComboPackages.service";

const service = new AdminGetComboPackagesService();
export const handler = async (
    event: any
) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const comboProductId =
            event.pathParameters?.comboProductId;

        if (!comboProductId) {
            return {
                statusCode: 400,
                body: "comboProductId is required",
            };
        }

        const result =
            await service.getComboProductNames(
                comboProductId
            );

        return {
            statusCode: 200,
            headers: {
                "Content-Type":
                    "application/json",
            },
            body: JSON.stringify(result),
        };
    } catch (err) {
        console.error(
            "AdminGetComboProductNames error",
            err
        );

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};