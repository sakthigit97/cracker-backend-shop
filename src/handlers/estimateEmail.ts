import { EmailService } from "../utils/email.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { AdminConfigService } from "../services/adminConfig.service";


export const handler = async (event: any) => {
    const emailService = new EmailService();
    const repo = new AdminConfigRepo();
    const service = new AdminConfigService(repo);
    const config = await service.getConfig();
    try {
        const body = JSON.parse(event.body || "{}");
        await emailService.sendEstimate({
            to: config.adminEmail || 'sakthiamsv97@gmail.com',
            customerName: body.customerName,
            mobile: body.mobile,
            pdfBase64: body.pdfBase64,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
            }),
        };
    } catch (err: any) {
        console.error(err);

        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message || "Unable to send estimate email",
            }),
        };
    }
};