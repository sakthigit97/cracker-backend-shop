import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    ScanCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({
    region: REGION,
});

const docClient =
    DynamoDBDocumentClient.from(client);

const CONFIG_TABLE =
    process.env.ADMIN_CONFIG_TABLE!;

const PRODUCTS_TABLE =
    process.env.PRODUCTS_TABLE!;

export class AdminUpdateComboPackageRepository {
    async updateComboPackage(
        comboId: string,
        newProductIds: string[]
    ) {
        const configResult =
            await docClient.send(
                new GetCommand({
                    TableName: CONFIG_TABLE,
                    Key: {
                        configId: "global",
                    },
                })
            );

        const config: any =
            configResult.Item;

        if (!config) {
            return null;
        }

        const packageTags =
            Array.isArray(config.packageTags)
                ? config.packageTags
                : [];

        const packageTag = packageTags.find(
            (tag: any) =>
                tag.id === comboId
        );

        if (!packageTag) {
            return null;
        }

        // ------------------------------------------------------------
        // 2. Find currently selected products
        // ------------------------------------------------------------

        const currentProductsResult =
            await docClient.send(
                new ScanCommand({
                    TableName: PRODUCTS_TABLE,
                    ProjectionExpression:
                        "productId, packageTagIds",
                    FilterExpression:
                        "contains(packageTagIds, :comboId)",
                    ExpressionAttributeValues: {
                        ":comboId": comboId,
                    },
                })
            );

        const currentProductIds =
            (currentProductsResult.Items ?? [])
                .map((item: any) =>
                    item.productId
                )
                .filter(Boolean);

        const currentSet =
            new Set(currentProductIds);

        const newSet =
            new Set(newProductIds);

        // ------------------------------------------------------------
        // 3. Products to remove combo ID from
        // ------------------------------------------------------------

        const productsToRemove =
            currentProductIds.filter(
                (productId) =>
                    !newSet.has(productId)
            );

        // ------------------------------------------------------------
        // 4. Products to add combo ID to
        // ------------------------------------------------------------

        const productsToAdd =
            newProductIds.filter(
                (productId) =>
                    !currentSet.has(productId)
            );

        // ------------------------------------------------------------
        // 5. Remove combo ID from old products
        // ------------------------------------------------------------

        for (const productId of productsToRemove) {
            await this.removePackageTagId(
                productId,
                comboId
            );
        }

        // ------------------------------------------------------------
        // 6. Add combo ID to newly selected products
        // ------------------------------------------------------------

        for (const productId of productsToAdd) {
            await this.addPackageTagId(
                productId,
                comboId
            );
        }

        // ------------------------------------------------------------
        // 7. Return updated combo
        // ------------------------------------------------------------

        return {
            comboId,
            name: packageTag.name,
            price: await this.getComboPrice(
                packageTag.productId
            ),
            productId:
                packageTag.productId,
            productIds: newProductIds,
        };
    }

    private async addPackageTagId(
        productId: string,
        comboId: string
    ) {
        await docClient.send(
            new UpdateCommand({
                TableName: PRODUCTS_TABLE,
                Key: {
                    productId,
                },
                UpdateExpression: `
                SET packageTagIds = list_append(
                    if_not_exists(packageTagIds, :emptyList),
                    :comboId
                )
            `,
                ExpressionAttributeValues: {
                    ":emptyList": [],
                    ":comboId": [comboId],
                    ":containsId": comboId,
                },
                ConditionExpression: `
                attribute_exists(productId)
                AND (
                    attribute_not_exists(packageTagIds)
                    OR NOT contains(packageTagIds, :containsId)
                )
            `,
            })
        );
    }

    private async removePackageTagId(
        productId: string,
        comboId: string
    ) {
        const result =
            await docClient.send(
                new GetCommand({
                    TableName: PRODUCTS_TABLE,
                    Key: {
                        productId,
                    },
                    ProjectionExpression:
                        "productId, packageTagIds",
                })
            );

        const product: any =
            result.Item;

        if (!product) {
            return;
        }

        const packageTagIds =
            Array.isArray(
                product.packageTagIds
            )
                ? product.packageTagIds
                : [];

        const updatedPackageTagIds =
            packageTagIds.filter(
                (id: string) =>
                    id !== comboId
            );

        await docClient.send(
            new UpdateCommand({
                TableName: PRODUCTS_TABLE,
                Key: {
                    productId,
                },
                UpdateExpression:
                    "SET packageTagIds = :packageTagIds",
                ExpressionAttributeValues: {
                    ":packageTagIds":
                        updatedPackageTagIds,
                },
                ConditionExpression:
                    "attribute_exists(productId)",
            })
        );
    }

    private async getComboPrice(
        productId: string
    ) {
        const result =
            await docClient.send(
                new GetCommand({
                    TableName: PRODUCTS_TABLE,
                    Key: {
                        productId,
                    },
                    ProjectionExpression:
                        "price",
                })
            );

        return Number(
            result.Item?.price ?? 0
        );
    }

    async deleteComboPackage(comboId: string) {

        const configResult =
            await docClient.send(
                new GetCommand({
                    TableName: CONFIG_TABLE,
                    Key: {
                        configId: "global",
                    },
                })
            );

        const config: any =
            configResult.Item;

        if (!config) {
            return null;
        }

        const packageTags =
            Array.isArray(config.packageTags)
                ? config.packageTags
                : [];

        const packageTag =
            packageTags.find(
                (tag: any) =>
                    tag.id === comboId
            );

        if (!packageTag) {
            return null;
        }

        const comboProductId =
            packageTag.productId;


        const mappedProducts: any[] = [];

        let lastEvaluatedKey:
            Record<string, any> | undefined = undefined;

        do {

            const mappedProductsResult: any =
                await docClient.send(
                    new ScanCommand({
                        TableName: PRODUCTS_TABLE,
                        ProjectionExpression:
                            "productId, packageTagIds",
                        FilterExpression:
                            "contains(packageTagIds, :comboId)",
                        ExpressionAttributeValues: {
                            ":comboId": comboId,
                        },
                        ExclusiveStartKey:
                            lastEvaluatedKey,
                    })
                );

            mappedProducts.push(
                ...(mappedProductsResult.Items ?? [])
            );

            lastEvaluatedKey =
                mappedProductsResult.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        for (const product of mappedProducts) {
            const productId =
                product.productId;

            if (!productId) {
                continue;
            }

            if (
                comboProductId &&
                productId === comboProductId
            ) {
                continue;
            }

            await this.removePackageTagId(
                productId,
                comboId
            );
        }

        if (comboProductId) {
            await this.deleteComboProduct(
                comboProductId
            );
        }

        const updatedPackageTags =
            packageTags.filter(
                (tag: any) =>
                    tag.id !== comboId
            );

        await docClient.send(
            new UpdateCommand({
                TableName: CONFIG_TABLE,
                Key: {
                    configId: "global",
                },
                UpdateExpression:
                    "SET packageTags = :packageTags",
                ExpressionAttributeValues: {
                    ":packageTags":
                        updatedPackageTags,
                },
                ConditionExpression:
                    "attribute_exists(configId)",
            })
        );

        return {
            comboId,
            productId:
                comboProductId,
            name:
                packageTag.name,
            deleted: true,
        };
    }

    private async deleteComboProduct(
        productId: string
    ) {
        await docClient.send(
            new DeleteCommand({
                TableName: PRODUCTS_TABLE,
                Key: {
                    productId,
                },
                ConditionExpression:
                    "attribute_exists(productId)",
            })
        );
    }
}