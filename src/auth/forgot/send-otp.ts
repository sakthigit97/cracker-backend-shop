import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { dbClient } from "../../libs/db";
import { success, error } from "../../libs/response";
import { OtpService } from "../../utils/otp.service";
import { AdminConfigRepo } from "../../repo/adminConfig.repo";
import { AdminConfigService } from "../../services/adminConfig.service";

const otpService = new OtpService();
const verifyCaptcha = async (token: string) => {
    const res = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`,
        }
    );

    const data = await res.json();
    return data.success;
};

export const handler = async (event: any) => {
    try {

        const repo = new AdminConfigRepo();
        const service = new AdminConfigService(repo);
        const config = await service.getConfig();

        const body = JSON.parse(event.body || "{}");
        const { mobile, captchaToken } = body;

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            return error("Enter a valid mobile number", 400);
        }

        if (!captchaToken || !(await verifyCaptcha(captchaToken))) {
            return error("Invalid CAPTCHA", 400);
        }

        const existing = await dbClient.send(
            new GetItemCommand({
                TableName: "Users",
                Key: {
                    mobile: { S: mobile },
                },
            })
        );

        if (!existing.Item) {
            return error("User not found. Please register first", 404);
        }

        if (config.isForgotOTPEnabled) {
            await otpService.sendOtp(mobile);
        } else {
            console.log('Forgot OTP send is not enabled');
        }

        return success({
            message: "OTP sent successfully",
        });

    } catch (err) {
        console.error(err);
        return error("Failed to send OTP", 500);
    }
};