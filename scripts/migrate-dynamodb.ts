import {
    DynamoDBClient,
    ScanCommand,
    BatchWriteItemCommand,
    DescribeTableCommand,
    type AttributeValue,
    type WriteRequest,
} from "@aws-sdk/client-dynamodb";

async function main() {
    // =========================================================
    // Read command-line arguments
    //
    // Command:
    //
    // npx ts-node scripts/migrate-dynamodb.ts \
    //   ap-south-1 AdminConfig-dev us-east-1 AdminConfig-prod
    //
    // =========================================================

    const args = process.argv.slice(2);

    if (args.length !== 4) {
        console.error("");
        console.error("Invalid arguments.");
        console.error("");
        console.error(
            "Usage:"
        );
        console.error(
            "npx ts-node scripts/migrate-dynamodb.ts <sourceRegion> <sourceTable> <targetRegion> <targetTable>"
        );
        console.error("");
        process.exit(1);
    }

    const sourceRegion = args[0];
    const sourceTable = args[1];
    const targetRegion = args[2];
    const targetTable = args[3];

    // =========================================================
    // DEBUG - IMPORTANT
    // =========================================================

    console.log("");
    console.log("==============================");
    console.log("Migration Configuration");
    console.log("==============================");
    console.log("");
    console.log("Arguments received:");
    console.log(args);
    console.log("");
    console.log("Source Region :", sourceRegion);
    console.log("Source Table  :", sourceTable);
    console.log("Target Region :", targetRegion);
    console.log("Target Table  :", targetTable);
    console.log("");

    // =========================================================
    // Create clients
    // =========================================================

    const sourceClient = new DynamoDBClient({
        region: sourceRegion,
    });

    const targetClient = new DynamoDBClient({
        region: targetRegion,
    });

    console.log(
        "Source DynamoDB endpoint:",
        `https://dynamodb.${sourceRegion}.amazonaws.com`
    );

    console.log(
        "Target DynamoDB endpoint:",
        `https://dynamodb.${targetRegion}.amazonaws.com`
    );

    console.log("");

    // =========================================================
    // Scan all items
    // =========================================================

    async function scanAll(
        client: DynamoDBClient,
        tableName: string
    ): Promise<Record<string, AttributeValue>[]> {
        const items: Record<string, AttributeValue>[] = [];

        let lastEvaluatedKey:
            | Record<string, AttributeValue>
            | undefined;

        do {
            const result = await client.send(
                new ScanCommand({
                    TableName: tableName,
                    ExclusiveStartKey:
                        lastEvaluatedKey,
                })
            );

            if (result.Items) {
                items.push(...result.Items);
            }

            lastEvaluatedKey =
                result.LastEvaluatedKey;

            console.log(
                `Scanned ${items.length} items from ${tableName}`
            );
        } while (lastEvaluatedKey);

        return items;
    }

    // =========================================================
    // Get primary key
    // =========================================================

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

    // =========================================================
    // Batch write
    // =========================================================

    async function batchWrite(
        client: DynamoDBClient,
        tableName: string,
        requests: WriteRequest[],
        action: string
    ) {
        for (
            let i = 0;
            i < requests.length;
            i += 25
        ) {
            const batch = requests.slice(
                i,
                i + 25
            );

            let requestItems: Record<
                string,
                WriteRequest[]
            > = {
                [tableName]: batch,
            };

            while (true) {
                const result =
                    await client.send(
                        new BatchWriteItemCommand(
                            {
                                RequestItems:
                                    requestItems,
                            }
                        )
                    );

                const unprocessed =
                    result.UnprocessedItems?.[
                    tableName
                    ] ?? [];

                if (
                    unprocessed.length === 0
                ) {
                    break;
                }

                console.log(
                    `Retrying ${unprocessed.length} unprocessed items...`
                );

                requestItems = {
                    [tableName]:
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

            console.log(
                `${action}: ${Math.min(
                    i + 25,
                    requests.length
                )}/${requests.length}`
            );
        }
    }

    // =========================================================
    // Verify source table
    // =========================================================

    console.log(
        `Checking source table: ${sourceTable}`
    );

    await sourceClient.send(
        new DescribeTableCommand({
            TableName: sourceTable,
        })
    );

    console.log(
        "Source table found successfully."
    );

    // =========================================================
    // Verify target table
    // =========================================================

    console.log(
        `Checking target table: ${targetTable}`
    );

    await targetClient.send(
        new DescribeTableCommand({
            TableName: targetTable,
        })
    );

    console.log(
        "Target table found successfully."
    );

    // =========================================================
    // Scan source
    // =========================================================

    console.log("");
    console.log("Scanning source table...");

    const sourceItems = await scanAll(
        sourceClient,
        sourceTable
    );

    console.log("");
    console.log(
        `Source item count: ${sourceItems.length}`
    );

    // =========================================================
    // Scan target
    // =========================================================

    console.log("");
    console.log("Scanning target table...");

    const targetItems = await scanAll(
        targetClient,
        targetTable
    );

    console.log("");
    console.log(
        `Existing target item count: ${targetItems.length}`
    );

    // =========================================================
    // Clear target
    // =========================================================

    if (targetItems.length > 0) {
        console.log("");
        console.log(
            `Clearing ${targetTable}...`
        );

        const keyNames =
            await getKeyNames(
                targetClient,
                targetTable
            );

        console.log(
            "Target primary key:",
            keyNames.join(", ")
        );

        const deleteRequests: WriteRequest[] =
            targetItems.map((item) => {
                const key: Record<
                    string,
                    AttributeValue
                > = {};

                for (const keyName of keyNames) {
                    if (!item[keyName]) {
                        throw new Error(
                            `Missing key '${keyName}' in target item`
                        );
                    }

                    key[keyName] =
                        item[keyName];
                }

                return {
                    DeleteRequest: {
                        Key: key,
                    },
                };
            });

        await batchWrite(
            targetClient,
            targetTable,
            deleteRequests,
            "Deleted"
        );

        console.log(
            "Target table cleared."
        );
    } else {
        console.log("");
        console.log(
            "Target table is already empty."
        );
    }

    // =========================================================
    // Copy source -> target
    //
    // IMPORTANT:
    //
    // We DO NOT:
    // - unmarshall
    // - marshall
    // - JSON stringify
    // - JSON parse
    // - CSV
    // - XLSX
    //
    // We directly copy AttributeValue objects.
    // =========================================================

    if (sourceItems.length > 0) {
        console.log("");
        console.log(
            `Copying ${sourceItems.length} items...`
        );

        const writeRequests: WriteRequest[] =
            sourceItems.map((item) => ({
                PutRequest: {
                    Item: item,
                },
            }));

        await batchWrite(
            targetClient,
            targetTable,
            writeRequests,
            "Copied"
        );
    } else {
        console.log("");
        console.log(
            "Source table is empty. Nothing to copy."
        );
    }

    // =========================================================
    // Verify
    // =========================================================

    console.log("");
    console.log(
        "Verifying destination..."
    );

    const finalTargetItems =
        await scanAll(
            targetClient,
            targetTable
        );

    console.log("");
    console.log("==============================");
    console.log("Migration Summary");
    console.log("==============================");
    console.log("");
    console.log(
        "Source      :",
        `${sourceRegion} / ${sourceTable}`
    );
    console.log(
        "Destination :",
        `${targetRegion} / ${targetTable}`
    );
    console.log("");
    console.log(
        "Source items      :",
        sourceItems.length
    );
    console.log(
        "Destination items :",
        finalTargetItems.length
    );
    console.log("");

    if (
        sourceItems.length !==
        finalTargetItems.length
    ) {
        throw new Error(
            `Verification failed. Source=${sourceItems.length}, Destination=${finalTargetItems.length}`
        );
    }

    console.log(
        "Item count verification: PASSED"
    );

    console.log("");
    console.log(
        "DynamoDB AttributeValue types were preserved."
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
        "================================"
    );
    console.error(
        "MIGRATION FAILED"
    );
    console.error(
        "================================"
    );
    console.error("");

    console.error(error);

    console.error("");

    process.exit(1);
});