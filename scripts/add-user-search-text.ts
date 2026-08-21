import {
    DynamoDBClient,
    ScanCommand,
    DescribeTableCommand,
    UpdateItemCommand,
    type AttributeValue,
} from "@aws-sdk/client-dynamodb";

/*
 * ============================================================
 * ADD USER SEARCH TEXT
 *
 * Usage:
 *
 * npx ts-node scripts/add-user-search-text.ts \
 *   ap-south-1 \
 *   Users-dev
 *
 * Adds/updates the following attribute for EVERY existing user:
 *
 * searchText
 *
 * Built from:
 *
 * name
 * userId
 * mobile
 * myReferralCode
 * state
 * city
 *
 * Example:
 *
 * name            = Sakthibalan
 * userId          = USER#123
 * mobile          = 8838913160
 * myReferralCode  = SAKTHI123
 * state           = Tamil Nadu
 * city            = Mannargudi
 *
 * Result:
 *
 * searchText =
 * "sakthibalan  user#123  8838913160  sakthi123  tamil nadu  mannargudi"
 *
 * Existing attributes are NOT removed.
 * Only searchText is added/updated.
 * ============================================================
 */

const RETRY_COUNT = 5;
const RETRY_DELAY_MS = 1000;

/*
 * ============================================================
 * FIELD NAMES
 * ============================================================
 *
 * Change these only if your DynamoDB user attributes use
 * different names.
 */

const SEARCH_FIELDS = [
    "name",
    "mobile",
    "myReferralCode"
] as const;

/*
 * ============================================================
 * SLEEP
 * ============================================================
 */

async function sleep(ms: number) {
    await new Promise((resolve) =>
        setTimeout(resolve, ms)
    );
}

/*
 * ============================================================
 * RETRY WRAPPER
 * ============================================================
 */

async function withRetry<T>(
    operation: () => Promise<T>,
    label: string
): Promise<T> {
    let lastError: unknown;

    for (
        let attempt = 1;
        attempt <= RETRY_COUNT;
        attempt++
    ) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            console.error(
                `${label} failed. Attempt ${attempt}/${RETRY_COUNT}`
            );

            if (attempt < RETRY_COUNT) {
                await sleep(
                    RETRY_DELAY_MS * attempt
                );
            }
        }
    }

    throw lastError;
}

/*
 * ============================================================
 * GET PRIMARY KEY NAMES
 * ============================================================
 */

async function getKeyNames(
    client: DynamoDBClient,
    tableName: string
): Promise<string[]> {
    const result = await client.send(
        new DescribeTableCommand({
            TableName: tableName,
        })
    );

    const keyNames =
        result.Table?.KeySchema
            ?.map(
                (key) => key.AttributeName
            )
            .filter(
                (
                    name
                ): name is string =>
                    Boolean(name)
            ) ?? [];

    if (!keyNames.length) {
        throw new Error(
            `Could not determine primary key for ${tableName}`
        );
    }

    return keyNames;
}

/*
 * ============================================================
 * GET STRING VALUE FROM DYNAMODB ATTRIBUTE
 * ============================================================
 */

function getAttributeString(
    item: Record<string, AttributeValue>,
    fieldName: string
): string {
    const value = item[fieldName];

    if (!value) {
        return "";
    }

    /*
     * String
     */
    if ("S" in value && value.S != null) {
        return String(value.S).trim();
    }

    /*
     * Number
     */
    if ("N" in value && value.N != null) {
        return String(value.N).trim();
    }

    /*
     * Boolean
     *
     * Not normally needed for search text,
     * but safely handled here.
     */
    if ("BOOL" in value && value.BOOL != null) {
        return String(value.BOOL).trim();
    }

    return "";
}

/*
 * ============================================================
 * BUILD SEARCH TEXT
 * ============================================================
 */

function buildSearchText(
    item: Record<string, AttributeValue>
): string {
    const values = SEARCH_FIELDS.map(
        (fieldName) =>
            getAttributeString(
                item,
                fieldName
            )
    );

    return values
        .filter(Boolean)
        .join("  ")
        .toLowerCase();
}

/*
 * ============================================================
 * SCAN ALL ITEMS
 * ============================================================
 */

async function scanAll(
    client: DynamoDBClient,
    tableName: string
): Promise<Record<string, AttributeValue>[]> {
    const items: Record<
        string,
        AttributeValue
    >[] = [];

    let lastEvaluatedKey:
        | Record<string, AttributeValue>
        | undefined;

    do {
        const result = await withRetry(
            () =>
                client.send(
                    new ScanCommand({
                        TableName:
                            tableName,

                        ExclusiveStartKey:
                            lastEvaluatedKey,
                    })
                ),
            "DynamoDB Scan"
        );

        if (result.Items?.length) {
            items.push(
                ...result.Items
            );
        }

        lastEvaluatedKey =
            result.LastEvaluatedKey;

        console.log(
            `Scanned ${items.length} items...`
        );
    } while (lastEvaluatedKey);

    return items;
}

/*
 * ============================================================
 * UPDATE ITEM
 * ============================================================
 */

async function updateItem(
    client: DynamoDBClient,
    tableName: string,
    item: Record<string, AttributeValue>,
    keyNames: string[],
    searchText: string
) {
    const key: Record<
        string,
        AttributeValue
    > = {};

    /*
     * Build primary key from the original item.
     */
    for (const keyName of keyNames) {
        const keyValue =
            item[keyName];

        if (!keyValue) {
            throw new Error(
                `Missing primary key '${keyName}' in item`
            );
        }

        key[keyName] = keyValue;
    }

    /*
     * Update ONLY searchText.
     *
     * Existing user attributes remain untouched.
     */
    await withRetry(
        () =>
            client.send(
                new UpdateItemCommand({
                    TableName:
                        tableName,

                    Key: key,

                    UpdateExpression:
                        "SET #searchText = :searchText",

                    ExpressionAttributeNames: {
                        "#searchText":
                            "searchText",
                    },

                    ExpressionAttributeValues: {
                        ":searchText": {
                            S: searchText,
                        },
                    },
                })
            ),
        "DynamoDB UpdateItem"
    );
}

/*
 * ============================================================
 * MAIN
 * ============================================================
 */

async function main() {
    /*
     * =========================================================
     * COMMAND LINE ARGUMENTS
     * =========================================================
     */

    const args =
        process.argv.slice(2);

    if (args.length !== 2) {
        console.error("");

        console.error(
            "Invalid arguments."
        );

        console.error("");

        console.error(
            "Usage:"
        );

        console.error(
            "npx ts-node scripts/add-user-search-text.ts <region> <table>"
        );

        console.error("");

        process.exit(1);
    }

    const region = args[0];
    const tableName = args[1];

    console.log("");
    console.log(
        "=========================================="
    );

    console.log(
        "DynamoDB User Search Text Migration"
    );

    console.log(
        "=========================================="
    );

    console.log("");

    console.log(
        "Region :",
        region
    );

    console.log(
        "Table  :",
        tableName
    );

    console.log("");

    /*
     * =========================================================
     * CREATE CLIENT
     * =========================================================
     */

    const client =
        new DynamoDBClient({
            region,
        });

    /*
     * =========================================================
     * VERIFY TABLE
     * =========================================================
     */

    console.log(
        `Checking table: ${tableName}`
    );

    const tableDescription =
        await withRetry(
            () =>
                client.send(
                    new DescribeTableCommand({
                        TableName:
                            tableName,
                    })
                ),
            "DescribeTable"
        );

    if (
        tableDescription.Table?.TableStatus !==
        "ACTIVE"
    ) {
        throw new Error(
            `Table '${tableName}' is not ACTIVE`
        );
    }

    console.log(
        "Table found and is ACTIVE."
    );

    console.log("");

    /*
     * =========================================================
     * GET PRIMARY KEY
     * =========================================================
     */

    const keyNames =
        await getKeyNames(
            client,
            tableName
        );

    console.log(
        "Primary Key:",
        keyNames.join(", ")
    );

    console.log("");

    /*
     * =========================================================
     * SEARCH FIELDS
     * =========================================================
     */

    console.log(
        "Search fields:"
    );

    SEARCH_FIELDS.forEach(
        (field) => {
            console.log(
                `  - ${field}`
            );
        }
    );

    console.log("");

    /*
     * =========================================================
     * SCAN ALL USERS
     * =========================================================
     */

    console.log(
        "Scanning table..."
    );

    const items =
        await scanAll(
            client,
            tableName
        );

    console.log("");

    console.log(
        `Total users found: ${items.length}`
    );

    console.log("");

    if (items.length === 0) {
        console.log(
            "Table is empty. Nothing to update."
        );

        return;
    }

    /*
     * =========================================================
     * UPDATE USERS
     * =========================================================
     */

    let updatedCount = 0;
    let failedCount = 0;

    console.log(
        "Updating users..."
    );

    console.log("");

    for (
        let index = 0;
        index < items.length;
        index++
    ) {
        const item =
            items[index];

        try {
            /*
             * Build searchText from:
             *
             * name
             * userId
             * mobile
             * myReferralCode
             * state
             * city
             */
            const searchText =
                buildSearchText(item);

            await updateItem(
                client,
                tableName,
                item,
                keyNames,
                searchText
            );

            updatedCount++;

            console.log(
                `Updated ${index + 1}/${items.length}`
            );

            /*
             * Optional useful log.
             *
             * Uncomment if you want to see
             * the generated search text.
             */
            /*
            console.log(
                `SearchText: ${searchText}`
            );
            */
        } catch (error) {
            failedCount++;

            console.error(
                `Failed ${index + 1}/${items.length}`,
                error
            );
        }
    }

    /*
     * =========================================================
     * SUMMARY
     * =========================================================
     */

    console.log("");

    console.log(
        "=========================================="
    );

    console.log(
        "Migration Summary"
    );

    console.log(
        "=========================================="
    );

    console.log("");

    console.log(
        "Region       :",
        region
    );

    console.log(
        "Table        :",
        tableName
    );

    console.log(
        "Total users  :",
        items.length
    );

    console.log(
        "Updated      :",
        updatedCount
    );

    console.log(
        "Failed       :",
        failedCount
    );

    console.log("");

    console.log(
        "Search fields:"
    );

    console.log(
        "name"
    );

    console.log(
        "userId"
    );

    console.log(
        "mobile"
    );

    console.log(
        "myReferralCode"
    );

    console.log(
        "state"
    );

    console.log(
        "city"
    );

    console.log("");

    if (failedCount > 0) {
        console.log(
            "Migration completed with failures."
        );
    } else {
        console.log(
            "Migration completed successfully."
        );
    }

    console.log("");
}

/*
 * ============================================================
 * ERROR HANDLER
 * ============================================================
 */

main().catch((error) => {
    console.error("");

    console.error(
        "=========================================="
    );

    console.error(
        "MIGRATION FAILED"
    );

    console.error(
        "=========================================="
    );

    console.error("");

    console.error(error);

    console.error("");

    process.exit(1);
});