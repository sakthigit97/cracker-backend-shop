import { verifyJwt } from "../utils/auth";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminConfigService } from "../services/adminConfig.service";

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                body: "Request body is required",
            };
        }

        const payload = JSON.parse(event.body);
        const repo = new AdminConfigRepo();
        const service = new AdminConfigService(repo);
        const updated = await service.updateConfig(payload);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updated),
        };
    } catch (err) {
        console.error("AdminUpdateConfig error", err);

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};