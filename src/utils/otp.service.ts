export class OtpService {
    private static MOCK_OTP = "123456";
    async sendOtp(mobile: string) {
        // Later:
        // 1. Generate random OTP
        // 2. Store in DynamoDB with TTL
        // 3. Send via SMS provider
        return {
            success: true,
            message: "OTP sent successfully",
        };
    }

    async verifyOtp(mobile: string, otp: string) {
        // Later:
        // 1. Fetch OTP record from DB
        // 2. Check expiry
        // 3. Match OTP

        if (otp !== OtpService.MOCK_OTP) {
            throw new Error("Invalid OTP");
        }

        return {
            success: true,
        };
    }
}
