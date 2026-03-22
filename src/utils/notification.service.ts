import { EmailService } from "./email.service";
import { SmsService } from "./sms.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminConfigService } from "../services/adminConfig.service";

let cachedConfig: any = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

export class NotificationService {
    private emailService = new EmailService();
    private smsService = new SmsService();

    private configService = new AdminConfigService(
        new AdminConfigRepo()
    );

    private async getConfig() {
        const now = Date.now();

        if (cachedConfig && now - cachedAt < CACHE_TTL) {
            return cachedConfig;
        }

        cachedConfig = await this.configService.getConfig();
        cachedAt = now;
        return cachedConfig;
    }

    async send(input: {
        email?: string;
        phone?: string;
        subject?: string;
        message: string;
    }) {
        const config = await this.getConfig();
        const isEmailEnabled = config?.isEmailEnabled === true;
        const isSmsEnabled = config?.isSmsEnabled === true;
        if (isEmailEnabled && input.email) {
            await this.emailService.send({
                to: input.email,
                subject: input.subject || "Notification",
                message: input.message,
            });
        }
        if (isSmsEnabled && input.phone) {
            await this.smsService.send({
                to: input.phone,
                message: input.message,
            });
        }
        return { success: true };
    }
}