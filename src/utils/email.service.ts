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

    async sendEstimate(input: {
        to: string;
        customerName: string;
        mobile: string;
        pdfBase64: string;
    }) {
        const body = {
            recipients: [
                {
                    to: [
                        {
                            email: input.to,
                            name: "Admin",
                        },
                    ],
                    variables: {
                        USERNAME: input.customerName,
                        PHONE_NUMBER: input.mobile,
                    },
                },
            ],
            from: {
                name: "Sivakasi Pyro Park",
                email: process.env.MSG91_EMAIL_FROM!,
            },
            domain: process.env.MSG91_EMAIL_DOMAIN!,
            attachments: [
                {
                    file: `data:application/pdf;base64,${input.pdfBase64}`,
                    fileName: `Estimate-${input.customerName.replace(/\s+/g, "-")}-${input.mobile}.pdf`,
                },
            ],
            template_id: process.env.MSG91_ESTIMATE_TEMPLATE!,
        };

        const response = await fetch(
            "https://control.msg91.com/api/v5/email/send",
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    authkey: process.env.MSG91_AUTH_KEY!,
                },
                body: JSON.stringify(body),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error(result);
            throw new Error(result?.message || "Unable to send estimate email");
        }

        console.log("Estimate email sent", result);
        return result;
    }
}