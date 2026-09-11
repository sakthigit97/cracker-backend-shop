import {
    PutCommand,
    ScanCommand,
    GetCommand,
    UpdateCommand,
    TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";
import { randomUUID } from "crypto";
const TABLE = process.env.DISCOUNT_TABLE!;
const STATE_ID = "__PRODUCT_DISCOUNT_STATE__";
const LEGACY_GROUP = "LEGACY";
export class AdminDiscountRepo {

    async listDiscounts() {
        const items: any[] = [];

        let ExclusiveStartKey:
            Record<string, any> | undefined =
            undefined;

        do {
            const res: any = await ddb.send(
                new ScanCommand({
                    TableName: TABLE,
                    ExclusiveStartKey,
                })
            );

            const normalItems =
                (res.Items || []).filter(
                    (item: any) =>
                        item.discountId !==
                        STATE_ID
                );

            items.push(...normalItems);

            ExclusiveStartKey =
                res.LastEvaluatedKey;
        } while (ExclusiveStartKey);

        return items;
    }

    async getDiscountById(
        discountId: string
    ) {
        const res = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: {
                    discountId,
                },
            })
        );

        return res.Item || null;
    }

    async createDiscount(input: any) {
        const item = {
            discountId:
                `disc-${randomUUID()}`,

            discountMode:
                input.discountMode,

            discountType:
                input.discountType,

            discountValue:
                input.discountValue,

            priority:
                input.priority,

            targetId:
                input.targetId,

            isActive:
                input.isActive ?? true,

            createdAt: new Date().toISOString(),
        };

        await ddb.send(
            new PutCommand({
                TableName: TABLE,
                Item: item,
            })
        );

        return item;
    }

    async createDiscountForAllProducts(
        products: any[],
        input: any
    ) {
        if (
            input.discountType !== "PRODUCT"
        ) {
            return {
                success: false,
                message:
                    "Apply to All is supported only for PRODUCT discounts.",
            };
        }

        const groupId = await this.getNextGroupId();
        const state = await this.getProductDiscountState();
        const previousGroupId =
            state?.currentGroupId ??
            LEGACY_GROUP;

        const allDiscounts = await this.listAllDiscountRecords();
        const productDiscounts =
            allDiscounts.filter(
                (discount: any) =>
                    String(
                        discount.discountType ||
                        ""
                    ).toUpperCase() ===
                    "PRODUCT"
            );

        const activeProductDiscounts =
            productDiscounts.filter(
                (discount: any) =>
                    discount.isActive === true
            );

        const eligibleProducts =
            products.filter(
                (product: any) => {
                    if (
                        product.isComboPackage ===
                        true
                    ) {
                        return false;
                    }

                    if (
                        product.isGiftPack ===
                        true
                    ) {
                        return false;
                    }

                    return Boolean(
                        product.productId
                    );
                }
            );

        if (
            eligibleProducts.length === 0
        ) {
            return {
                success: false,
                message:
                    "No eligible products found for Apply to All.",
            };
        }

        const operations: any[] = [];
        for (
            const discount
            of activeProductDiscounts
        ) {
            operations.push({
                Update: {
                    TableName: TABLE,

                    Key: {
                        discountId:
                            discount.discountId,
                    },

                    UpdateExpression:
                        "SET isActive = :inactive, restoreGroupId = :restoreGroupId, previousIsActive = :previousIsActive",

                    ExpressionAttributeValues: {
                        ":inactive": false,
                        ":restoreGroupId": groupId,
                        ":previousIsActive": true,
                    },
                },
            });
        }

        const created: any[] = [];

        for (
            const product
            of eligibleProducts
        ) {
            const item = {
                discountId:
                    `disc-${randomUUID()}`,

                discountMode:
                    input.discountMode,

                discountType:
                    "PRODUCT",

                discountValue:
                    input.discountValue,

                priority: input.priority,

                targetId: product.productId,
                isActive: input.isActive ?? true,
                groupId,

                createdAt:
                    new Date().toISOString(),
            };

            created.push(item);
            operations.push({
                Put: {
                    TableName: TABLE,
                    Item: item,
                },
            });
        }

        await this.executeTransactionChunks(
            operations
        );

        await this.setProductDiscountState({
            currentGroupId: groupId,
            previousGroupId,
        });

        return {
            success: true,
            groupId,
            previousGroupId,
            count: created.length,
            discounts: created,
        };
    }

    async restoreProductDiscounts() {
        const stateRes = await ddb.send(
            new GetCommand({
                TableName: TABLE,
                Key: {
                    discountId: "__PRODUCT_DISCOUNT_STATE__",
                },
            })
        );

        const state = stateRes.Item;

        if (!state) {
            return {
                success: false,
                message:
                    "No product discount restore state is available.",
            };
        }

        const currentGroupId = state.currentGroupId;
        const previousGroupId = state.previousGroupId;

        if (
            previousGroupId === "LEGACY"
        ) {
            let ExclusiveStartKey: any =
                undefined;

            const updates: any[] = [];

            do {
                const res = await ddb.send(
                    new ScanCommand({
                        TableName: TABLE,
                        ExclusiveStartKey,
                    })
                );

                for (const discount of res.Items || []) {
                    if (
                        discount.discountId ===
                        "__PRODUCT_DISCOUNT_STATE__"
                    ) {
                        continue;
                    }

                    if (
                        discount.discountType !==
                        "PRODUCT"
                    ) {
                        continue;
                    }

                    if (
                        discount.groupId !==
                        undefined
                    ) {
                        continue;
                    }

                    if (
                        typeof discount.previousIsActive !==
                        "boolean"
                    ) {
                        continue;
                    }

                    updates.push({
                        Update: {
                            TableName: TABLE,
                            Key: {
                                discountId:
                                    discount.discountId,
                            },
                            UpdateExpression:
                                "SET isActive = :active",
                            ExpressionAttributeValues: {
                                ":active":
                                    discount.previousIsActive,
                            },
                        },
                    });
                }

                ExclusiveStartKey =
                    res.LastEvaluatedKey;
            } while (ExclusiveStartKey);
            let currentStartKey: any =
                undefined;

            do {
                const res = await ddb.send(
                    new ScanCommand({
                        TableName: TABLE,
                        ExclusiveStartKey:
                            currentStartKey,
                        FilterExpression:
                            "discountType = :type AND groupId = :groupId",
                        ExpressionAttributeValues: {
                            ":type": "PRODUCT",
                            ":groupId":
                                currentGroupId,
                        },
                    })
                );

                for (const discount of res.Items || []) {
                    updates.push({
                        Update: {
                            TableName: TABLE,
                            Key: {
                                discountId:
                                    discount.discountId,
                            },
                            UpdateExpression:
                                "SET isActive = :active",
                            ExpressionAttributeValues: {
                                ":active": false,
                            },
                        },
                    });
                }

                currentStartKey =
                    res.LastEvaluatedKey;
            } while (currentStartKey);

            for (
                let i = 0;
                i < updates.length;
                i += 100
            ) {
                await ddb.send(
                    new TransactWriteCommand({
                        TransactItems:
                            updates.slice(
                                i,
                                i + 100
                            ),
                    })
                );
            }

            await ddb.send(
                new UpdateCommand({
                    TableName: TABLE,
                    Key: {
                        discountId:
                            "__PRODUCT_DISCOUNT_STATE__",
                    },
                    UpdateExpression: `
                    SET currentGroupId = :current
                `,
                    ExpressionAttributeValues: {
                        ":current": null,
                    },
                })
            );

            return {
                success: true,
                restored: "LEGACY",
                deactivatedGroup:
                    currentGroupId,
                updated:
                    updates.length,
            };
        }

        let ExclusiveStartKey: any =
            undefined;

        const updates: any[] = [];

        do {
            const res = await ddb.send(
                new ScanCommand({
                    TableName: TABLE,
                    ExclusiveStartKey,
                    FilterExpression:
                        "discountType = :type AND " +
                        "(groupId = :current OR groupId = :previous)",
                    ExpressionAttributeValues: {
                        ":type": "PRODUCT",
                        ":current":
                            currentGroupId,
                        ":previous":
                            Number(previousGroupId),
                    },
                })
            );

            for (const discount of res.Items || []) {
                if (
                    discount.groupId ===
                    currentGroupId
                ) {
                    updates.push({
                        Update: {
                            TableName: TABLE,
                            Key: {
                                discountId:
                                    discount.discountId,
                            },
                            UpdateExpression:
                                "SET isActive = :active",
                            ExpressionAttributeValues: {
                                ":active": false,
                            },
                        },
                    });
                }

                if (
                    discount.groupId ===
                    Number(previousGroupId)
                ) {
                    updates.push({
                        Update: {
                            TableName: TABLE,
                            Key: {
                                discountId:
                                    discount.discountId,
                            },
                            UpdateExpression:
                                "SET isActive = :active",
                            ExpressionAttributeValues: {
                                ":active": true,
                            },
                        },
                    });
                }
            }

            ExclusiveStartKey =
                res.LastEvaluatedKey;
        } while (ExclusiveStartKey);

        for (
            let i = 0;
            i < updates.length;
            i += 100
        ) {
            await ddb.send(
                new TransactWriteCommand({
                    TransactItems:
                        updates.slice(
                            i,
                            i + 100
                        ),
                })
            );
        }

        await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: {
                    discountId:
                        "__PRODUCT_DISCOUNT_STATE__",
                },
                UpdateExpression: `
            SET currentGroupId = :current,
                previousGroupId = :previous
        `,
                ExpressionAttributeValues: {
                    ":current":
                        Number(previousGroupId),
                    ":previous":
                        Number(currentGroupId),
                },
            })
        );

        return {
            success: true,
            restoredGroup:
                Number(previousGroupId),
            deactivatedGroup:
                Number(currentGroupId),
            updated:
                updates.length,
        };
    }

    async updateDiscount(
        discountId: string,
        input: {
            discountMode: string;
            discountValue: number;
            priority: number;
            isActive: boolean;
        }
    ) {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE,

                Key: {
                    discountId,
                },

                UpdateExpression: `
                    SET discountMode = :m,
                        discountValue = :v,
                        priority = :p,
                        isActive = :a
                `,

                ExpressionAttributeValues: {
                    ":m":
                        input.discountMode,

                    ":v":
                        input.discountValue,

                    ":p":
                        input.priority,

                    ":a":
                        input.isActive,
                },
            })
        );

        return true;
    }

    async existsByTargetId(
        targetId: string
    ) {
        const res = await ddb.send(
            new ScanCommand({
                TableName: TABLE,

                FilterExpression:
                    "targetId = :targetId",

                ExpressionAttributeValues: {
                    ":targetId":
                        targetId,
                },

                ProjectionExpression:
                    "discountId",
            })
        );

        return (
            res.Items?.length ?? 0
        ) > 0;
    }

    private async listAllDiscountRecords() {
        const items: any[] = [];

        let ExclusiveStartKey:
            Record<string, any> | undefined =
            undefined;

        do {
            const res: any = await ddb.send(
                new ScanCommand({
                    TableName: TABLE,
                    ExclusiveStartKey,
                })
            );

            if (res.Items?.length) {
                items.push(...res.Items);
            }

            ExclusiveStartKey =
                res.LastEvaluatedKey;
        } while (ExclusiveStartKey);

        return items.filter(
            (item: any) =>
                item.discountId !==
                STATE_ID
        );
    }

    private async getProductDiscountState() {
        const res = await ddb.send(
            new GetCommand({
                TableName: TABLE,

                Key: {
                    discountId:
                        STATE_ID,
                },
            })
        );

        return res.Item || null;
    }

    private async getNextGroupId() {
        const res = await ddb.send(
            new UpdateCommand({
                TableName: TABLE,

                Key: {
                    discountId:
                        STATE_ID,
                },

                UpdateExpression:
                    "SET nextGroupId = if_not_exists(nextGroupId, :zero) + :one",

                ExpressionAttributeValues: {
                    ":zero": 0,
                    ":one": 1,
                },

                ReturnValues:
                    "UPDATED_NEW",
            })
        );

        return Number(
            res.Attributes?.nextGroupId
        );
    }

    private async setProductDiscountState(
        input: {
            currentGroupId:
            number | string;
            previousGroupId:
            number | string;
        }
    ) {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: {
                    discountId:
                        STATE_ID,
                },
                UpdateExpression: `
                    SET currentGroupId = :currentGroupId,
                        previousGroupId = :previousGroupId,
                        recordType = :recordType
                `,
                ExpressionAttributeValues: {
                    ":currentGroupId":
                        input.currentGroupId,
                    ":previousGroupId":
                        input.previousGroupId,
                    ":recordType":
                        "PRODUCT_DISCOUNT_STATE",
                },
            })
        );
    }

    private getStateRecords(
        discounts: any[],
        groupId: number | string,
        snapshotGroupId?: number | string
    ) {
        if (
            groupId === LEGACY_GROUP
        ) {
            if (
                snapshotGroupId ===
                undefined
            ) {
                return [];
            }

            return discounts.filter(
                (discount: any) =>
                    !discount.groupId &&
                    discount.restoreGroupId ===
                    snapshotGroupId
            );
        }

        return discounts.filter(
            (discount: any) =>
                discount.groupId ===
                groupId
        );
    }

    private async executeTransactionChunks(
        operations: any[]
    ) {
        const CHUNK_SIZE = 100;

        for (
            let i = 0;
            i < operations.length;
            i += CHUNK_SIZE
        ) {
            const chunk =
                operations.slice(
                    i,
                    i + CHUNK_SIZE
                );

            if (
                chunk.length === 0
            ) {
                continue;
            }

            await ddb.send(
                new TransactWriteCommand({
                    TransactItems:
                        chunk,
                })
            );
        }
    }
}