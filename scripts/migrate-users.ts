import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

import {
    DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
    DynamoDBDocumentClient,
    BatchWriteCommand,
    GetCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = "us-east-1";
const TABLE_NAME = "Users-prod";
const EXCEL_FILE = "./data/users.xlsx";
const MISSING_USERS_FILE = "./data/missing-users.txt";
const DEFAULT_PASSWORD = "user@123";

const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({
        region: REGION,
    })
);

/**
 * Indian states / union territories.
 *
 * Used only when the complete address is provided as a
 * free-form string without commas.
 */
const INDIAN_STATES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
];

/**
 * Normalize whitespace.
 */
function clean(value: unknown): string {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Parse address where city, state and pincode are stored
 * inside the same Excel address column.
 *
 * Supported example:
 *
 * Santoshi mata mandir, shanti nagar, dahisar east,
 * Mumbai, Maharashtra, 400068
 *
 * Result:
 *
 * address -> Santoshi mata mandir, shanti nagar, dahisar east
 * city    -> Mumbai
 * state   -> Maharashtra
 * pincode -> 400068
 */
function parseAddress(fullAddress: string) {
    const original = clean(fullAddress);

    let address = "";
    let city = "";
    let state = "";
    let pincode = "";

    if (!original) {
        return {
            address,
            city,
            state,
            pincode,
        };
    }

    // --------------------------------------------------
    // 1. Extract pincode
    // --------------------------------------------------

    const pinMatches = original.match(/\b\d{6}\b/g);

    if (pinMatches && pinMatches.length > 0) {
        pincode = pinMatches[pinMatches.length - 1];
    }

    let cleanedAddress = original
        .replace(/\b\d{6}\b/g, "")
        .replace(/\s*-\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();

    const parts = cleanedAddress
        .split(",")
        .map((part) => clean(part))
        .filter(Boolean);

    if (parts.length >= 3) {
        const possibleState = parts[parts.length - 1];
        const possibleCity = parts[parts.length - 2];

        const matchedState = INDIAN_STATES.find(
            (stateName) =>
                stateName.toLowerCase() ===
                possibleState.toLowerCase()
        );

        if (matchedState) {
            state = matchedState;
            city = possibleCity;

            address = parts
                .slice(0, -2)
                .join(", ")
                .trim();

            return {
                address,
                city,
                state,
                pincode,
            };
        }
    }

    // --------------------------------------------------
    // 3. Handle comma format where state is detectable
    // --------------------------------------------------

    if (parts.length >= 2) {
        const possibleState = parts[parts.length - 1];

        const matchedState = INDIAN_STATES.find(
            (stateName) =>
                stateName.toLowerCase() ===
                possibleState.toLowerCase()
        );

        if (matchedState) {
            state = matchedState;

            if (parts.length >= 2) {
                city = parts[parts.length - 2];
            }

            address = parts
                .slice(0, -2)
                .join(", ")
                .trim();

            return {
                address,
                city,
                state,
                pincode,
            };
        }
    }

    // --------------------------------------------------
    // 4. Handle free-form address without commas
    //
    // Example:
    //
    // Santoshi mata mandir shanti nagar dahisar east
    // Mumbai Maharashtra 400068
    // --------------------------------------------------

    if (cleanedAddress) {
        const lowerAddress = cleanedAddress.toLowerCase();

        const matchedState = INDIAN_STATES
            .sort((a, b) => b.length - a.length)
            .find((stateName) =>
                lowerAddress.endsWith(stateName.toLowerCase())
            );

        if (matchedState) {
            state = matchedState;

            const beforeState = cleanedAddress
                .slice(
                    0,
                    cleanedAddress.length -
                    matchedState.length
                )
                .trim();

            const words = beforeState
                .split(/\s+/)
                .filter(Boolean);

            if (words.length >= 1) {
                // Last word/group before state is treated as city.
                // For known examples such as:
                // "... dahisar east Mumbai Maharashtra"
                // city = Mumbai
                //
                // We keep this conservative and use the final
                // token as city rather than inventing address data.
                city = words[words.length - 1];

                address = words
                    .slice(0, -1)
                    .join(" ")
                    .trim();
            }
        } else {
            // We cannot safely infer city/state.
            address = cleanedAddress;
        }
    }

    return {
        address,
        city,
        state,
        pincode,
    };
}

/**
 * Normalize Indian mobile number.
 *
 * Accept:
 * 9876543210
 * +91 9876543210
 * 91-9876543210
 *
 * Returns:
 * 9876543210
 *
 * Invalid values return "".
 */
function normalizeMobile(value: unknown): string {
    const raw = clean(value);

    if (!raw) {
        return "";
    }

    const digits = raw.replace(/\D/g, "");

    // Already a valid Indian 10-digit mobile.
    if (/^[6-9]\d{9}$/.test(digits)) {
        return digits;
    }

    // Handle +91 / 91 prefix.
    if (
        digits.length === 12 &&
        digits.startsWith("91")
    ) {
        const mobile = digits.slice(2);

        if (/^[6-9]\d{9}$/.test(mobile)) {
            return mobile;
        }
    }

    return "";
}

/**
 * Validate email.
 *
 * Email is NOT mandatory for import.
 */
function normalizeEmail(value: unknown): string {
    const email = clean(value);

    if (!email) {
        return "";
    }

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email) ? email : "";
}

/**
 * Add skipped user information to text file.
 *
 * Only valid mobile numbers are written here.
 * This file is intended for later cleanup.
 */
function recordSkippedUser(
    mobile: string,
    reason: string
) {
    const line =
        `${mobile || "UNKNOWN"} | ${reason}\n`;

    fs.appendFileSync(
        MISSING_USERS_FILE,
        line,
        "utf8"
    );
}

/**
 * Main migration.
 */
async function main() {
    console.log("========================================");
    console.log("Users Production Migration");
    console.log("========================================");
    console.log(`Region : ${REGION}`);
    console.log(`Table  : ${TABLE_NAME}`);
    console.log(`Excel  : ${EXCEL_FILE}`);
    console.log("");

    // --------------------------------------------------
    // Validate Excel file
    // --------------------------------------------------

    if (!fs.existsSync(EXCEL_FILE)) {
        throw new Error(
            `Excel file not found: ${EXCEL_FILE}`
        );
    }

    // --------------------------------------------------
    // Prepare missing users file
    // --------------------------------------------------

    const missingFileDir =
        path.dirname(MISSING_USERS_FILE);

    if (!fs.existsSync(missingFileDir)) {
        fs.mkdirSync(missingFileDir, {
            recursive: true,
        });
    }

    // Start fresh for this migration run.
    fs.writeFileSync(
        MISSING_USERS_FILE,
        "Skipped Users\n" +
        "==============\n",
        "utf8"
    );

    // --------------------------------------------------
    // Read Excel
    // --------------------------------------------------

    console.log("Reading Excel...");

    const workbook =
        XLSX.readFile(EXCEL_FILE);

    if (!workbook.SheetNames.length) {
        throw new Error(
            "Excel file does not contain any sheets."
        );
    }

    const sheet =
        workbook.Sheets[
        workbook.SheetNames[0]
        ];

    const rows: any[] =
        XLSX.utils.sheet_to_json(sheet, {
            defval: "",
        });

    console.log(
        `Found ${rows.length} rows`
    );

    if (rows.length === 0) {
        throw new Error(
            "Excel file contains no user records."
        );
    }

    // --------------------------------------------------
    // Password hash
    // --------------------------------------------------

    console.log(
        "Generating default password hash..."
    );

    const passwordHash =
        await bcrypt.hash(
            DEFAULT_PASSWORD,
            10
        );

    console.log(
        "Password hash generated."
    );
    console.log("");

    // --------------------------------------------------
    // Migration state
    // --------------------------------------------------

    const seen =
        new Set<string>();

    const items: any[] = [];

    let skipped = 0;
    let existing = 0;
    let invalid = 0;
    let duplicate = 0;

    // --------------------------------------------------
    // Process rows
    // --------------------------------------------------

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];

        const excelRowNumber =
            index + 2;

        // ----------------------------------------------
        // Mobile
        // ----------------------------------------------

        const rawMobile =
            row.user_phone;

        const mobile =
            normalizeMobile(rawMobile);

        if (!mobile) {
            console.log(
                `Skipping Excel row ${excelRowNumber}: invalid/missing mobile "${rawMobile}"`
            );

            skipped++;
            invalid++;

            // No valid mobile exists to record.
            recordSkippedUser(
                "",
                `Excel row ${excelRowNumber} - invalid/missing mobile`
            );

            continue;
        }

        // ----------------------------------------------
        // Duplicate inside Excel
        // ----------------------------------------------

        if (seen.has(mobile)) {
            console.log(
                `Skipping ${mobile}: duplicate in Excel`
            );

            skipped++;
            duplicate++;

            recordSkippedUser(
                mobile,
                "Duplicate mobile number in Excel"
            );

            continue;
        }

        seen.add(mobile);

        // ----------------------------------------------
        // Check existing production user
        // ----------------------------------------------

        const exists =
            await client.send(
                new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        mobile,
                    },
                })
            );

        if (exists.Item) {
            console.log(
                `Skipping ${mobile}: already exists in production`
            );

            skipped++;
            existing++;

            recordSkippedUser(
                mobile,
                "User already exists in production"
            );

            continue;
        }

        // ----------------------------------------------
        // Name
        // ----------------------------------------------

        const name =
            clean(row.user_name);

        // ----------------------------------------------
        // Email
        // ----------------------------------------------

        const email = normalizeEmail(row.user_email);

        // Invalid email is intentionally NOT a
        // reason to skip the user.
        if (
            clean(row.user_email) &&
            !email
        ) {
            console.log(
                `Invalid email for ${mobile}; storing empty email`
            );
        }

        // ----------------------------------------------
        // Address
        // ----------------------------------------------

        const rawAddress =
            clean(row.user_addr1);

        const parsed =
            parseAddress(rawAddress);

        // ----------------------------------------------
        // Mandatory validation
        //
        // Mobile
        // Name
        // Address
        // City
        // State
        // Pincode
        // ----------------------------------------------

        const missingFields: string[] = [];

        if (!mobile) {
            missingFields.push("mobile");
        }

        if (!name) {
            missingFields.push("name");
        }

        if (!parsed.address) {
            missingFields.push("address");
        }

        if (!parsed.city) {
            missingFields.push("city");
        }

        if (!parsed.state) {
            missingFields.push("state");
        }

        if (!/^\d{6}$/.test(parsed.pincode)) {
            missingFields.push("pincode");
        }

        if (missingFields.length > 0) {
            const reason =
                `Missing/invalid fields: ${missingFields.join(
                    ", "
                )}`;

            console.log(
                `Skipping ${mobile}: ${reason}`
            );

            skipped++;
            invalid++;

            recordSkippedUser(
                mobile,
                reason
            );

            continue;
        }

        // ----------------------------------------------
        // Build DynamoDB item
        //
        // Keep the same types as Users table.
        // ----------------------------------------------

        const referralCode =
            `CRK${Math.floor(100000 + Math.random() * 900000)}`;
        const item = {
            mobile: mobile,
            name: name,
            email: email,
            address: parsed.address,
            city: parsed.city,
            state: parsed.state,
            pincode: parsed.pincode,

            passwordHash: passwordHash,

            role: "user",

            walletCredit: 0,

            referralCode: referralCode,
            referredBy: "",

            referralRewarded: false,

            createdAt:
                new Date().toISOString(),
        };

        items.push(item);

        console.log(
            `Prepared ${mobile} | ${name} | ${parsed.city}, ${parsed.state} ${parsed.pincode}`
        );
    }

    // --------------------------------------------------
    // Summary before writing
    // --------------------------------------------------

    console.log("");
    console.log("========================================");
    console.log("Validation completed");
    console.log("========================================");
    console.log(
        `Excel rows       : ${rows.length}`
    );
    console.log(
        `Ready to import  : ${items.length}`
    );
    console.log(
        `Skipped          : ${skipped}`
    );
    console.log(
        `Existing users   : ${existing}`
    );
    console.log(
        `Invalid/missing  : ${invalid}`
    );
    console.log(
        `Duplicates       : ${duplicate}`
    );
    console.log("");

    if (items.length === 0) {
        console.log(
            "No users are eligible for import."
        );

        console.log(
            `Skipped users file: ${MISSING_USERS_FILE}`
        );

        return;
    }

    // --------------------------------------------------
    // Batch write
    //
    // DynamoDB BatchWrite maximum = 25 items.
    // --------------------------------------------------

    console.log(
        `Starting import of ${items.length} users...`
    );

    let imported = 0;

    for (
        let i = 0;
        i < items.length;
        i += 25
    ) {
        const batch =
            items.slice(i, i + 25);

        let requestItems: Record<
            string,
            any[]
        > = {
            [TABLE_NAME]:
                batch.map((item) => ({
                    PutRequest: {
                        Item: item,
                    },
                })),
        };

        while (true) {
            const result =
                await client.send(
                    new BatchWriteCommand({
                        RequestItems:
                            requestItems,
                    })
                );

            const unprocessed =
                result.UnprocessedItems?.[
                TABLE_NAME
                ] ?? [];

            if (
                unprocessed.length === 0
            ) {
                break;
            }

            console.log(
                `Retrying ${unprocessed.length} unprocessed users...`
            );

            requestItems = {
                [TABLE_NAME]:
                    unprocessed,
            };

            await new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        1000
                    )
            );
        }

        imported += batch.length;

        console.log(
            `Imported ${imported}/${items.length}`
        );
    }

    // --------------------------------------------------
    // Final result
    // --------------------------------------------------

    console.log("");
    console.log("========================================");
    console.log("Migration completed");
    console.log("========================================");
    console.log(
        `Imported         : ${imported}`
    );
    console.log(
        `Skipped          : ${skipped}`
    );
    console.log(
        `Existing         : ${existing}`
    );
    console.log(
        `Invalid/missing  : ${invalid}`
    );
    console.log(
        `Duplicates       : ${duplicate}`
    );
    console.log(
        `Skipped users    : ${MISSING_USERS_FILE}`
    );
    console.log("========================================");
}

main().catch((error) => {
    console.error("");
    console.error(
        "Migration failed:"
    );
    console.error(error);

    process.exit(1);
});