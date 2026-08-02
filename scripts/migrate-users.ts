
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

import {
    DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
    DynamoDBDocumentClient,
    BatchWriteCommand,
    GetCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = "ap-south-1";
const TABLE_NAME = "Users";
const EXCEL_FILE = "./data/users-test.xlsx";

const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({
        region: REGION,
    })
);

function parseAddress(fullAddress: string) {
    const address = (fullAddress || "").trim();

    let city = "";
    let state = "";
    let pincode = "";

    const pinMatch = address.match(/\b\d{6}\b/);
    if (pinMatch) {
        pincode = pinMatch[0];
    }

    const cleaned = address
        .replace(/\b\d{6}\b/, "")
        .replace(/\s*-\s*/, "")
        .trim();

    const parts = cleaned
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    if (parts.length >= 2) {
        state = parts[parts.length - 1];
        city = parts[parts.length - 2];
    } else if (parts.length === 1) {
        city = parts[0];
    }

    const addressLine = parts.slice(0, -2).join(", ");
    return {
        address: addressLine || address,
        city,
        state,
        pincode,
    };
}

async function main() {

    console.log("Reading Excel...");

    const workbook = XLSX.readFile(EXCEL_FILE);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
    });

    console.log(`Found ${rows.length} rows`);

    const passwordHash = await bcrypt.hash("user@123", 10);

    const seen = new Set<string>();

    const items: any[] = [];

    let skipped = 0;

    for (const row of rows) {

        const mobile = String(row.user_phone ?? "")
            .replace(/\D/g, "")
            .trim();

        if (!/^\d{10}$/.test(mobile)) {
            console.log(
                `Skipping row - Invalid mobile "${row.user_phone}"`
            );
            skipped++;
            continue;
        }

        if (!mobile) {
            skipped++;
            continue;
        }

        if (!/^\d{10}$/.test(mobile)) {
            console.log(`Invalid mobile ${mobile}`);
            skipped++;
            continue;
        }

        if (seen.has(mobile)) {
            console.log(`Duplicate in excel ${mobile}`);
            skipped++;
            continue;
        }

        seen.add(mobile);

        const exists = await client.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    mobile,
                },
            })
        );

        if (exists.Item) {
            console.log(`${mobile} already exists`);
            skipped++;
            continue;
        }

        let email = String(row.user_email ?? "").trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            console.log(
                `Invalid email "${email}" for ${mobile}. Storing as empty.`
            );
            email = "";
        }

        const parsed = parseAddress(
            String(row.user_addr1 ?? "").trim()
        );

        items.push({

            mobile,

            name: String(row.user_name ?? "").trim() || mobile,
            email,

            address: parsed.address,

            city: parsed.city,

            state: parsed.state,

            pincode: parsed.pincode,

            passwordHash,

            role: "user",

            walletCredit: 0,

            referralCode: "",

            referredBy: "",

            referralRewarded: false,

            createdAt: new Date().toISOString(),

        });
    }

    console.log(
        `Ready to import ${items.length}`
    );

    for (let i = 0; i < items.length; i += 25) {

        const batch = items.slice(i, i + 25);

        let requestItems: any = {
            [TABLE_NAME]: batch.map((item) => ({
                PutRequest: {
                    Item: item,
                },
            })),
        };

        while (true) {

            const result: any = await client.send(
                new BatchWriteCommand({
                    RequestItems: requestItems,
                })
            );

            const unprocessed =
                result.UnprocessedItems?.[
                TABLE_NAME
                ];

            if (
                !unprocessed ||
                unprocessed.length === 0
            ) {
                break;
            }

            console.log(
                `Retrying ${unprocessed.length}`
            );

            requestItems = {
                [TABLE_NAME]: unprocessed,
            };

            await new Promise((r) =>
                setTimeout(r, 1000)
            );
        }

        console.log(
            `Imported ${Math.min(
                i + 25,
                items.length
            )}/${items.length}`
        );
    }

    console.log("");

    console.log("Migration completed");

    console.log(
        `Imported : ${items.length}`
    );

    console.log(
        `Skipped  : ${skipped}`
    );
}

main().catch(console.error);

