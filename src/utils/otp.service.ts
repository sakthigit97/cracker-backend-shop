import {
    PutItemCommand,
    GetItemCommand,
    DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";

import { dbClient } from "../libs/db";
export class OtpService {

    async sendOtp(
        mobile: string,
        username: string = "User"
    ) {
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const expiryTime = Math.floor(Date.now() / 1000) + 5 * 60;
        await dbClient.send(
            new PutItemCommand({
                TableName: process.env.OTP_TABLE!,
                Item: {
                    mobile: { S: mobile },
                    otp: { S: otp },
                    ttl: {
                        N: String(expiryTime),
                    },
                },
            })
        );

        const payload = {
            template_id: process.env.OTP_TEMPLATE_ID!,
            recipients: [
                {
                    mobiles: `91${mobile}`,
                    OTP: otp,
                    USERNAME: username,
                    SVKCURL: process.env.DOMAIN!
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

            throw new Error(
                "OTP send failed"
            );
        }

        return {
            success: true,
        };
    }

    async verifyOtp(
        mobile: string,
        otp: string
    ) {
        const res = await dbClient.send(
            new GetItemCommand({
                TableName: process.env.OTP_TABLE!,
                Key: {
                    mobile: { S: mobile },
                },
            })
        );

        if (!res.Item) {
            throw new Error(
                "OTP expired"
            );
        }

        const storedOtp = res.Item.otp.S;
        if (storedOtp !== otp) {
            throw new Error(
                "Invalid OTP"
            );
        }

        await dbClient.send(
            new DeleteItemCommand({
                TableName:
                    process.env.OTP_TABLE!,
                Key: {
                    mobile: { S: mobile },
                },
            })
        );

        return {
            success: true,
        };
    }
}
