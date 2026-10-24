import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { invalidateNotificationConfigCache } from "../utils/notificationConfigCache";

export class AdminConfigService {
    constructor(private repo: AdminConfigRepo) { }

    async getConfig() {
        const config = await this.repo.getGlobalConfig();
        if (!config) {
            return {
                isPaymentEnabled: false,
                isEmailEnabled: false,
                isSmsEnabled: false,
                isChitReminderSMSEnabled: false,
                maintenanceMode: false,
                sliderImages: [],
            };
        }
        const { configId, updatedAt, ...publicConfig } = config;
        return publicConfig;
    }

    async updateConfig(payload: Record<string, any>) {
        const updated = await this.repo.updateGlobalConfig(payload);
        invalidateNotificationConfigCache();
        const { configId, updatedAt, ...publicConfig } = updated;
        return publicConfig;
    }
}