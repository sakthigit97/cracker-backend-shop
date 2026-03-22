export class SmsService {
    async send(input: { to: string; message: string }) {
        console.log(" SMS MOCK SENT");
        console.log("To:", input.to);
        console.log("Message:", input.message);

        return {
            success: true,
            provider: "MOCK",
        };
    }
}