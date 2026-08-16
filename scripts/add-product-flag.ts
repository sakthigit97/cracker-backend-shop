import {
    DynamoDBClient,
    ScanCommand,
    DescribeTableCommand,
    UpdateItemCommand,
    type AttributeValue,
} from "@aws-sdk/client-dynamodb";

/*
 * ============================================================
 * ADD PRODUCT ORDER TYPE FLAGS
 *
 * Usage:
 *
 * npx ts-node scripts/add-product-flags.ts \
 *   ap-south-1 \
 *   Products-dev
 *
 * Adds to EVERY existing item:
 *
 * isRetailOnly    = true
 * isBulkOrderOnly = true
 *
 * Existing attributes are NOT overwritten.
 * ============================================================
 */

const RETRY_COUNT = 5;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
    await new Promise((resolve) =>
        setTimeout(resolve, ms)
    );
}

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

async function updateItem(
    client: DynamoDBClient,
    tableName: string,
    item: Record<string, AttributeValue>,
    keyNames: string[]
) {

    const key: Record<
        string,
        AttributeValue
    > = {};

    for (const keyName of keyNames) {

        const keyValue =
            item[keyName];

        if (!keyValue) {
            throw new Error(
                `Missing primary key '${keyName}' in item`
            );
        }

        key[keyName] =
            keyValue;
    }

    /*
     * Only add the attributes if they do not
     * already exist.
     *
     * This prevents accidentally changing
     * an existing false value.
     */
    await withRetry(
        () =>
            client.send(
                new UpdateItemCommand({
                    TableName:
                        tableName,

                    Key: key,

                    UpdateExpression:
                        "SET #retail = if_not_exists(#retail, :true), " +
                        "#bulk = if_not_exists(#bulk, :true)",

                    ExpressionAttributeNames: {
                        "#retail":
                            "isRetailOnly",

                        "#bulk":
                            "isBulkOrderOnly",
                    },

                    ExpressionAttributeValues: {
                        ":true": {
                            BOOL: true,
                        },
                    },
                })
            ),
        "DynamoDB UpdateItem"
    );
}

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
            "npx ts-node scripts/add-product-flags.ts <region> <table>"
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
        "DynamoDB Product Flags Migration"
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
     * SCAN ALL ITEMS
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
        `Total items found: ${items.length}`
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
     * UPDATE ITEMS
     * =========================================================
     */

    let updatedCount = 0;

    let skippedCount = 0;

    console.log(
        "Updating items..."
    );

    console.log("");

    for (
        let index = 0;
        index < items.length;
        index++
    ) {

        const item =
            items[index];

        /*
         * If both fields are already true,
         * no update is required.
         */
        const retailAlreadyTrue =
            item.isRetailOnly?.BOOL === true;

        const bulkAlreadyTrue =
            item.isBulkOrderOnly?.BOOL === true;

        if (
            retailAlreadyTrue &&
            bulkAlreadyTrue
        ) {

            skippedCount++;

            console.log(
                `Skipped ${index + 1}/${items.length}`
            );

            continue;
        }

        await updateItem(
            client,
            tableName,
            item,
            keyNames
        );

        updatedCount++;

        console.log(
            `Updated ${index + 1}/${items.length}`
        );
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
        "Total items  :",
        items.length
    );

    console.log(
        "Updated      :",
        updatedCount
    );

    console.log(
        "Skipped      :",
        skippedCount
    );

    console.log("");

    console.log(
        "Fields added:"
    );

    console.log(
        "isRetailOnly    = true"
    );

    console.log(
        "isBulkOrderOnly = true"
    );

    console.log("");

    console.log(
        "Migration completed successfully."
    );

    console.log("");
}

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