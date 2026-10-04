import {
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";
import { FlashSale } from "../types/flashSale.types";

const FLASH_SALES_TABLE =
    process.env.FLASH_SALES_TABLE!;

const PRODUCTS_TABLE =
    process.env.PRODUCTS_TABLE!;

const STATUS_INDEX = "status-endAt-index";

type ProcessableStatus =
    | "SCHEDULED"
    | "ACTIVE";

function nowIso(): string {
    return new Date().toISOString();
}

function isConditionalCheckFailed(
    error: unknown,
): boolean {
    return (
        error instanceof Error &&
        error.name ===
        "ConditionalCheckFailedException"
    );
}

async function getSalesByStatus(
    status: ProcessableStatus,
): Promise<FlashSale[]> {
    const sales: FlashSale[] = [];

    let ExclusiveStartKey:
        | Record<string, any>
        | undefined;

    do {
        const result = await ddb.send(
            new QueryCommand({
                TableName: FLASH_SALES_TABLE,
                IndexName: STATUS_INDEX,

                KeyConditionExpression:
                    "#status = :status",

                ExpressionAttributeNames: {
                    "#status": "status",
                },

                ExpressionAttributeValues: {
                    ":status": status,
                },

                ExclusiveStartKey,
            }),
        );

        sales.push(
            ...((result.Items ?? []) as FlashSale[]),
        );

        ExclusiveStartKey =
            result.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return sales;
}

async function activateProductFlashSale(
    sale: FlashSale,
): Promise<void> {
    await ddb.send(
        new UpdateCommand({
            TableName: PRODUCTS_TABLE,

            Key: {
                productId: sale.productId,
            },

            UpdateExpression: `
                SET isFlashSale = :isFlashSale,
                    flashSaleId = :flashSaleId,
                    flashSalePrice = :flashSalePrice
            `,

            ExpressionAttributeValues: {
                ":isFlashSale": true,
                ":flashSaleId": sale.flashSaleId,
                ":flashSalePrice": sale.salePrice,
            },

            ConditionExpression: `
                attribute_not_exists(flashSaleId)
                OR flashSaleId = :flashSaleId
            `,
        }),
    );
}

async function deactivateProductFlashSale(
    sale: FlashSale,
): Promise<void> {
    await ddb.send(
        new UpdateCommand({
            TableName: PRODUCTS_TABLE,
            Key: {
                productId: sale.productId,
            },

            UpdateExpression: `
                REMOVE isFlashSale,
                       flashSaleId,
                       flashSalePrice
            `,

            ConditionExpression:
                "flashSaleId = :flashSaleId",

            ExpressionAttributeValues: {
                ":flashSaleId":
                    sale.flashSaleId,
            },
        }),
    );
}

async function markFlashSaleActive(
    sale: FlashSale,
    updatedAt: string,
): Promise<void> {
    await ddb.send(
        new UpdateCommand({
            TableName: FLASH_SALES_TABLE,

            Key: {
                flashSaleId: sale.flashSaleId,
            },

            UpdateExpression: `
                SET #status = :activeStatus,
                    updatedAt = :updatedAt
            `,

            ExpressionAttributeNames: {
                "#status": "status",
            },

            ExpressionAttributeValues: {
                ":activeStatus": "ACTIVE",
                ":scheduledStatus": "SCHEDULED",
                ":updatedAt": updatedAt,
            },

            ConditionExpression:
                "#status = :scheduledStatus",
        }),
    );
}

export async function activateDueFlashSales(): Promise<number> {
    const now = nowIso();

    const scheduledSales =
        await getSalesByStatus("SCHEDULED");

    const dueSales = scheduledSales.filter(
        (sale) =>
            sale.startAt <= now &&
            sale.endAt > now,
    );

    let activatedCount = 0;

    for (const sale of dueSales) {
        try {
            await activateProductFlashSale(sale);

            await markFlashSaleActive(
                sale,
                now,
            );

            activatedCount++;
        } catch (error) {
            if (
                isConditionalCheckFailed(error)
            ) {
                console.warn(
                    `Flash sale ${sale.flashSaleId} was not activated because its state changed or the product is owned by another flash sale.`,
                );

                continue;
            }

            console.error(
                `Failed to activate flash sale ${sale.flashSaleId}:`,
                error,
            );
        }
    }

    return activatedCount;
}

export async function expireMissedScheduledFlashSales(): Promise<number> {
    const now = nowIso();

    const scheduledSales =
        await getSalesByStatus("SCHEDULED");

    const missedSales = scheduledSales.filter(
        (sale) => sale.endAt <= now,
    );

    let expiredCount = 0;

    for (const sale of missedSales) {
        try {
            await deleteFlashSale(sale);

            expiredCount++;
        } catch (error) {
            if (
                isConditionalCheckFailed(error)
            ) {
                console.warn(
                    `Scheduled flash sale ${sale.flashSaleId} was already changed by another process.`,
                );

                continue;
            }

            console.error(
                `Failed to expire missed flash sale ${sale.flashSaleId}:`,
                error,
            );
        }
    }

    return expiredCount;
}

export async function expireDueFlashSales(): Promise<number> {
    const now = nowIso();

    const activeSales =
        await getSalesByStatus("ACTIVE");

    const expiredSales = activeSales.filter(
        (sale) => sale.endAt <= now,
    );

    let expiredCount = 0;

    for (const sale of expiredSales) {
        try {
            try {
                await deactivateProductFlashSale(
                    sale,
                );
            } catch (error) {
                if (
                    !isConditionalCheckFailed(
                        error,
                    )
                ) {
                    throw error;
                }

                console.warn(
                    `Product ${sale.productId} is no longer owned by flash sale ${sale.flashSaleId}. Skipping product cleanup.`,
                );
            }

            await deleteFlashSale(sale);

            expiredCount++;
        } catch (error) {
            if (
                isConditionalCheckFailed(error)
            ) {
                console.warn(
                    `Active flash sale ${sale.flashSaleId} was already changed by another process.`,
                );

                continue;
            }

            console.error(
                `Failed to expire flash sale ${sale.flashSaleId}:`,
                error,
            );
        }
    }

    return expiredCount;
}

export async function processFlashSales(): Promise<{
    activated: number;
    expired: number;
    missed: number;
}> {
    const missed =
        await expireMissedScheduledFlashSales();

    const activated =
        await activateDueFlashSales();

    const expired =
        await expireDueFlashSales();

    return {
        activated,
        expired,
        missed,
    };
}

async function deleteFlashSale(
    sale: FlashSale,
): Promise<void> {
    await ddb.send(
        new DeleteCommand({
            TableName: FLASH_SALES_TABLE,

            Key: {
                flashSaleId: sale.flashSaleId,
            },

            ConditionExpression:
                "#status = :status",

            ExpressionAttributeNames: {
                "#status": "status",
            },

            ExpressionAttributeValues: {
                ":status": sale.status,
            },
        }),
    );
}