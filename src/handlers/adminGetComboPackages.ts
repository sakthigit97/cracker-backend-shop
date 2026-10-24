import { verifyJwt } from "../utils/auth";
import { AdminGetComboPackagesService } from "../services/adminGetComboPackages.service";
const service = new AdminGetComboPackagesService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const combos = await service.listComboPackages();
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(combos),
        };
    } catch (err) {
        console.error(
            "AdminGetComboPackages error",
            err
        );

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};