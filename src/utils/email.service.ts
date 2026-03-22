export class EmailService {
    async send(input: {
        to: string;
        subject: string;
        message: string;
    }) {

        console.log("EMAIL MOCK SENT");
        console.log("To:", input.to);
        console.log("Subject:", input.subject);
        console.log("Message:", input.message);

        return {
            success: true,
            provider: "MOCK",
        };
    }
}