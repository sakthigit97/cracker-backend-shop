import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { dbClient } from "../../libs/db";
import { hashPassword } from "../../libs/hash";
import { success, error } from "../../libs/response";
import { OtpService } from "../../utils/otp.service";

const otpService = new OtpService();

export const handler = async (event: any) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const { mobile, otp, password } = body;

        if (!mobile || !otp || !password) {
            return error("Missing fields", 400);
        }

        try {
            await otpService.verifyOtp(mobile, otp);
        } catch {
            return error("Invalid OTP", 400);
        }

        const passwordHash = await hashPassword(password);

        await dbClient.send(
            new UpdateItemCommand({
                TableName: "Users",
                Key: { mobile: { S: mobile } },
                UpdateExpression: "SET passwordHash = :p",
                ExpressionAttributeValues: {
                    ":p": { S: passwordHash },
                },
            })
        );

        return success({
            message: "Password updated successfully",
        });

    } catch (err) {
        console.error(err);
        return error("Failed to reset password", 500);
    }
};