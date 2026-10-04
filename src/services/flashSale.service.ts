import {
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";

import {
    CreateFlashSaleInput,
    FlashSale,
    FlashSaleStatus,
    UpdateFlashSaleInput,
} from "../types/flashSale.types";

const FLASH_SALES_TABLE = process.env.FLASH_SALES_TABLE!;
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;

const PRODUCT_INDEX = "productId-startAt-index";

function nowIso(): string {
    return new Date().toISOString();
}

/**
 * Convert a supplied date into a normalized UTC ISO string.
 */
function normalizeDate(value: string, fieldName: string): string {
    if (!value || typeof value !== "string") {
        throw new Error(`${fieldName} is required`);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid ${fieldName}`);
    }

    return date.toISOString();
}

/**
 * Validate and normalize start/end dates.
 */
function validateDates(
    startAt: string,
    endAt: string,
): {
    startAt: string;
    endAt: string;
} {
    const normalizedStartAt = normalizeDate(
        startAt,
        "start date",
    );

    const normalizedEndAt = normalizeDate(
        endAt,
        "end date",
    );

    const start = new Date(normalizedStartAt).getTime();
    const end = new Date(normalizedEndAt).getTime();
    const now = Date.now();

    if (start >= end) {
        throw new Error(
            "Start date must be before end date",
        );
    }

    if (end <= now) {
        throw new Error(
            "Flash sale end date must be in the future",
        );
    }

    return {
        startAt: normalizedStartAt,
        endAt: normalizedEndAt,
    };
}

/**
 * Determine the status based on the current time.
 */
function getStatus(
    startAt: string,
    endAt: string,
): FlashSaleStatus {
    const now = Date.now();

    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();

    if (now < start) {
        return "SCHEDULED";
    }

    if (now >= start && now < end) {
        return "ACTIVE";
    }

    return "EXPIRED";
}
async function getProduct(
    productId: string,
): Promise<Record<string, any> | null> {
    const result = await ddb.send(
        new GetCommand({
            TableName: PRODUCTS_TABLE,
            Key: {
                productId: productId,
            },
        }),
    );

    return (result.Item as Record<string, any>) ?? null;
}

async function getProductFlashSales(
    productId: string,
): Promise<FlashSale[]> {
    const items: FlashSale[] = [];

    let ExclusiveStartKey:
        | Record<string, any>
        | undefined;

    do {
        const result = await ddb.send(
            new QueryCommand({
                TableName: FLASH_SALES_TABLE,
                IndexName: PRODUCT_INDEX,
                KeyConditionExpression:
                    "productId = :productId",
                ExpressionAttributeValues: {
                    ":productId": productId,
                },
                ExclusiveStartKey,
            }),
        );

        items.push(
            ...((result.Items ?? []) as FlashSale[]),
        );

        ExclusiveStartKey =
            result.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return items;
}

function isOverlapping(
    startAt: string,
    endAt: string,
    existingStartAt: string,
    existingEndAt: string,
): boolean {
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();

    const existingStart = new Date(
        existingStartAt,
    ).getTime();

    const existingEnd = new Date(
        existingEndAt,
    ).getTime();

    return (
        start < existingEnd &&
        end > existingStart
    );
}

/**
 * Make sure the same product does not have
 * overlapping active/scheduled flash sales.
 */
async function validateNoOverlap(
    productId: string,
    startAt: string,
    endAt: string,
    excludeFlashSaleId?: string,
): Promise<void> {
    const sales =
        await getProductFlashSales(productId);

    const overlappingSale = sales.find((sale) => {
        if (
            sale.flashSaleId ===
            excludeFlashSaleId
        ) {
            return false;
        }

        if (
            sale.status === "CANCELLED" ||
            sale.status === "EXPIRED"
        ) {
            return false;
        }

        return isOverlapping(
            startAt,
            endAt,
            sale.startAt,
            sale.endAt,
        );
    });

    if (overlappingSale) {
        throw new Error(
            `Product already has a flash sale between ${overlappingSale.startAt} and ${overlappingSale.endAt}`,
        );
    }
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

/**
 * Create a new flash sale.
 */
export async function createFlashSale(
    input: CreateFlashSaleInput,
): Promise<FlashSale> {
    const {
        productId,
        header,
        imageUrl,
        salePrice,
        startAt,
        endAt,
    } = input;

    if (!productId?.trim()) {
        throw new Error("Product ID is required");
    }

    if (!header?.trim()) {
        throw new Error(
            "Flash sale header is required",
        );
    }

    if (!imageUrl?.trim()) {
        throw new Error(
            "Flash sale image is required",
        );
    }

    if (
        !Number.isFinite(salePrice) ||
        salePrice <= 0
    ) {
        throw new Error(
            "Sale price must be greater than zero",
        );
    }

    const normalizedDates = validateDates(
        startAt,
        endAt,
    );

    const product = await getProduct(
        productId.trim(),
    );

    if (!product) {
        throw new Error("Product not found");
    }

    const originalPrice = Number(
        product.price,
    );

    if (
        !Number.isFinite(originalPrice) ||
        originalPrice <= 0
    ) {
        throw new Error(
            "Product has an invalid price",
        );
    }

    if (salePrice >= originalPrice) {
        throw new Error(
            "Flash sale price must be lower than the original price",
        );
    }

    await validateNoOverlap(
        productId.trim(),
        normalizedDates.startAt,
        normalizedDates.endAt,
    );

    const timestamp = nowIso();

    const status = getStatus(
        normalizedDates.startAt,
        normalizedDates.endAt,
    );

    const flashSale: FlashSale = {
        flashSaleId: crypto.randomUUID(),
        productId: productId.trim(),
        header: header.trim(),
        imageUrl: imageUrl.trim(),
        originalPrice,
        salePrice,
        startAt: normalizedDates.startAt,
        endAt: normalizedDates.endAt,
        status,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    await ddb.send(
        new PutCommand({
            TableName: FLASH_SALES_TABLE,
            Item: flashSale,
            ConditionExpression:
                "attribute_not_exists(flashSaleId)",
        }),
    );

    if (status === "ACTIVE") {
        try {
            await activateProductFlashSale(
                flashSale,
            );
        } catch (error) {
            console.error(
                "Failed to activate product for flash sale:",
                error,
            );

            throw new Error(
                "Flash sale was created but could not be activated on the product",
            );
        }
    }

    return flashSale;
}

export async function getFlashSale(
    flashSaleId: string,
): Promise<FlashSale | null> {
    if (!flashSaleId?.trim()) {
        throw new Error(
            "Flash sale ID is required",
        );
    }

    const result = await ddb.send(
        new GetCommand({
            TableName: FLASH_SALES_TABLE,
            Key: {
                flashSaleId: flashSaleId.trim(),
            },
        }),
    );

    return (
        (result.Item as FlashSale) ?? null
    );
}

async function getFlashSalesByStatus(
    status: FlashSaleStatus,
): Promise<FlashSale[]> {
    const items: FlashSale[] = [];

    let ExclusiveStartKey:
        | Record<string, any>
        | undefined;

    do {
        const result = await ddb.send(
            new QueryCommand({
                TableName: FLASH_SALES_TABLE,
                IndexName:
                    "status-endAt-index",
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

        items.push(
            ...((result.Items ?? []) as FlashSale[]),
        );

        ExclusiveStartKey =
            result.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return items;
}

export async function listFlashSales(): Promise<
    FlashSale[]
> {
    const statuses: FlashSaleStatus[] = [
        "SCHEDULED",
        "ACTIVE",
        "EXPIRED",
        "CANCELLED",
    ];

    const results = await Promise.all(
        statuses.map((status) =>
            getFlashSalesByStatus(status),
        ),
    );

    return results
        .flat()
        .sort(
            (a, b) =>
                new Date(
                    b.startAt,
                ).getTime() -
                new Date(
                    a.startAt,
                ).getTime(),
        );
}

export async function updateFlashSale(
    flashSaleId: string,
    input: UpdateFlashSaleInput,
): Promise<FlashSale> {
    const existing =
        await getFlashSale(flashSaleId);

    if (!existing) {
        throw new Error(
            "Flash sale not found",
        );
    }

    if (
        existing.status === "EXPIRED" ||
        existing.status === "CANCELLED"
    ) {
        throw new Error(
            "Expired or cancelled flash sales cannot be updated",
        );
    }

    if (
        input.header !== undefined &&
        !input.header.trim()
    ) {
        throw new Error(
            "Flash sale header is required",
        );
    }

    if (
        input.imageUrl !== undefined &&
        !input.imageUrl.trim()
    ) {
        throw new Error(
            "Flash sale image is required",
        );
    }

    const rawStartAt =
        input.startAt ?? existing.startAt;

    const rawEndAt =
        input.endAt ?? existing.endAt;

    const normalizedDates = validateDates(
        rawStartAt,
        rawEndAt,
    );

    const salePrice =
        input.salePrice ??
        existing.salePrice;

    if (
        !Number.isFinite(salePrice) ||
        salePrice <= 0
    ) {
        throw new Error(
            "Sale price must be greater than zero",
        );
    }

    if (salePrice >= existing.originalPrice) {
        throw new Error(
            "Flash sale price must be lower than the original price",
        );
    }

    await validateNoOverlap(
        existing.productId,
        normalizedDates.startAt,
        normalizedDates.endAt,
        flashSaleId,
    );

    const updatedAt = nowIso();

    const newStatus = getStatus(
        normalizedDates.startAt,
        normalizedDates.endAt,
    );

    const updatedHeader =
        input.header !== undefined
            ? input.header.trim()
            : existing.header;

    const updatedImageUrl =
        input.imageUrl !== undefined
            ? input.imageUrl.trim()
            : existing.imageUrl;

    const result = await ddb.send(
        new UpdateCommand({
            TableName: FLASH_SALES_TABLE,
            Key: {
                flashSaleId,
            },
            UpdateExpression: `
                SET #header = :header,
                    imageUrl = :imageUrl,
                    salePrice = :salePrice,
                    startAt = :startAt,
                    endAt = :endAt,
                    #status = :status,
                    updatedAt = :updatedAt
            `,
            ExpressionAttributeNames: {
                "#header": "header",
                "#status": "status",
            },
            ExpressionAttributeValues: {
                ":header": updatedHeader,
                ":imageUrl": updatedImageUrl,
                ":salePrice": salePrice,
                ":startAt":
                    normalizedDates.startAt,
                ":endAt":
                    normalizedDates.endAt,
                ":status": newStatus,
                ":updatedAt": updatedAt,
            },
            ReturnValues: "ALL_NEW",
        }),
    );

    const updatedSale =
        result.Attributes as FlashSale;

    if (newStatus === "ACTIVE") {
        await activateProductFlashSale(
            updatedSale,
        );
    } else {
        if (existing.status === "ACTIVE") {
            try {
                await deactivateProductFlashSale(
                    existing,
                );
            } catch (error) {
                console.error(
                    "Failed to deactivate previous product flash sale:",
                    error,
                );
            }
        }
    }

    return updatedSale;
}


export async function cancelFlashSale(
    flashSaleId: string,
): Promise<void> {
    const existing =
        await getFlashSale(flashSaleId);

    if (!existing) {
        throw new Error(
            "Flash sale not found",
        );
    }

    if (
        existing.status === "EXPIRED" ||
        existing.status === "CANCELLED"
    ) {
        return;
    }

    if (existing.status === "ACTIVE") {
        try {
            await deactivateProductFlashSale(
                existing,
            );
        } catch (error) {
            console.error(
                "Failed to deactivate product flash sale:",
                error,
            );

            throw new Error(
                "Flash sale could not be cancelled because the product state could not be updated",
            );
        }
    }

    await ddb.send(
        new UpdateCommand({
            TableName: FLASH_SALES_TABLE,
            Key: {
                flashSaleId,
            },
            UpdateExpression: `
                SET #status = :cancelledStatus,
                    updatedAt = :updatedAt
            `,
            ExpressionAttributeNames: {
                "#status": "status",
            },
            ExpressionAttributeValues: {
                ":cancelledStatus": "CANCELLED",
                ":updatedAt": nowIso(),
            },
            ConditionExpression:
                "#status <> :cancelledStatus",
        }),
    );
}

export async function listActiveFlashSales(): Promise<FlashSale[]> {
    return getFlashSalesByStatus("ACTIVE");
}