import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    ScanCommand,
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

export class AdminGetComboPackageRepository {
    async getComboPackage(comboId: string) {
        // ------------------------------------------------------------
        // Get package tag from global config
        // ------------------------------------------------------------

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
        // Get combo product
        // ------------------------------------------------------------

        const productResult =
            await docClient.send(
                new GetCommand({
                    TableName: PRODUCTS_TABLE,
                    Key: {
                        productId:
                            packageTag.productId,
                    },
                })
            );

        const comboProduct: any =
            productResult.Item;

        if (!comboProduct) {
            return null;
        }

        // ------------------------------------------------------------
        // Find normal products containing this combo tag
        // ------------------------------------------------------------

        const productsResult =
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

        const productIds =
            (productsResult.Items ?? [])
                .map((item: any) =>
                    item.productId
                )
                .filter(Boolean);

        return {
            comboId: packageTag.id,
            name:
                packageTag.name ??
                comboProduct.name ??
                "",
            price: Number(
                comboProduct.price ?? 0
            ),
            productId:
                comboProduct.productId,
            productIds,
        };
    }
}