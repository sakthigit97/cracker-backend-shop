import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminConfigService } from "../services/adminConfig.service";

export const handler = async () => {
    const repo = new AdminConfigRepo();
    const service = new AdminConfigService(repo);
    const config = await service.getConfig();
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=600",
        },
        body: JSON.stringify(config),
    };
};
