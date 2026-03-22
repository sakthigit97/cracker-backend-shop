import { success, error } from "../libs/response";
import { OtpService } from "../utils/otp.service";

const otpService = new OtpService();
export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { mobile } = body;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return error("Enter a valid mobile number", 400);
    }

    await otpService.sendOtp(mobile);
    return success({
      message: "OTP sent successfully",
    });
  } catch {
    return error("Failed to send OTP", 500);
  }
};