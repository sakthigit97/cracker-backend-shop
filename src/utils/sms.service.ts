export class SmsService {

    async send(input: {
        to: string;
        templateId: string;
        variables: Record<string, string | number>;
    }) {

        const payload = {
            template_id: input.templateId,
            recipients: [
                {
                    mobiles: `91${input.to}`,
                    ...input.variables,
                },
            ],
        };

        const res = await fetch(
            "https://control.msg91.com/api/v5/flow/",
            {
                method: "POST",
                headers: {
                    authkey: process.env.MSG91_AUTH_KEY!,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }

        );

        const data = await res.json();
        if (!res.ok) {

            console.error(
                "MSG91 Error",
                data
            );

            throw new Error("SMS sending failed");

        }
        return data;
    }

}