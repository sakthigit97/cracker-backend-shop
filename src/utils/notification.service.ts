import { EmailService } from "./email.service";
import { SmsService } from "./sms.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminConfigService } from "../services/adminConfig.service";
import { notificationConfigCache } from "./notificationConfigCache";

const CACHE_TTL = 5 * 60 * 1000;

export class NotificationService {
    private emailService = new EmailService();
    private smsService = new SmsService();

    private configService = new AdminConfigService(
        new AdminConfigRepo()
    );

    private async getConfig() {
        const now = Date.now();

        if (
            notificationConfigCache.value &&
            now - notificationConfigCache.cachedAt < CACHE_TTL
        ) {
            return notificationConfigCache.value;
        }

        notificationConfigCache.value =
            await this.configService.getConfig();
        notificationConfigCache.cachedAt = now;
        return notificationConfigCache.value;
    }

    async send(input: {
        email?: string;
        phone?: string;
        subject?: string;
        message: string;
        smsTemplateId?: string;
        smsVariables?: Record<string, string | number>;
        smsFeature?: "chitReminder";
    }) {
        const config = await this.getConfig();
        const isEmailEnabled = config?.isEmailEnabled === true;
        let isSmsEnabled = config?.isSmsEnabled === true;
        if (input.smsFeature === "chitReminder") {
            isSmsEnabled =
                isSmsEnabled &&
                config?.isChitReminderSMSEnabled === true;
        }
        let emailSent = false;
        let smsSent = false;
        if (isEmailEnabled && input.email) {
            await this.emailService.send({
                to: input.email,
                subject: input.subject || "Notification",
                message: input.message,
            });
            emailSent = true;
        }
        if (isSmsEnabled && input.phone) {
            if (!input.smsTemplateId) {
                throw new Error(
                    "CHIT_REMINDER_TID must be configured before chit reminder SMS is enabled."
                );
            }
            await this.smsService.send({
                to: input.phone,
                templateId: input.smsTemplateId,
                variables: input.smsVariables ?? {},
            });
            smsSent = true;
        }
        return { success: true, emailSent, smsSent };
    }
}