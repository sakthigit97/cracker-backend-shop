import {
    S3Client,
    ListObjectsV2Command,
    DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import {
    DynamoDBClient,
    BatchGetItemCommand,
    AttributeValue,
} from "@aws-sdk/client-dynamodb";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const ddb = new DynamoDBClient({ region: process.env.AWS_REGION });

const BUCKET = process.env.BUCKET_NAME!;
const TABLE = process.env.PRODUCTS_TABLE!;
const SAFE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const handler = async () => {
    const now = Date.now();
    const list = await s3.send(
        new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: "products/",
            Delimiter: "/",
        })
    );

    const productIds =
        list.CommonPrefixes?.map(
            (p) => p.Prefix?.split("/")[1]
        ).filter((v): v is string => Boolean(v)) || [];

    if (!productIds.length) return;
    const keys = productIds.map((id) => ({
        productId: { S: id },
    }));

    const dbRes = await ddb.send(
        new BatchGetItemCommand({
            RequestItems: {
                [TABLE]: {
                    Keys: keys,
                    ProjectionExpression: "productId, imageUrls",
                },
            },
        })
    );

    const dbItems =
        (dbRes.Responses?.[TABLE] as Record<
            string,
            AttributeValue
        >[]) || [];

    const existingProducts = new Map<string, string[]>();

    for (const item of dbItems) {
        const productId = item.productId?.S;
        if (!productId) continue;

        const imageUrls =
            item.imageUrls?.L
                ?.map((v) => v.S)
                .filter((v): v is string => Boolean(v)) || [];

        existingProducts.set(productId, imageUrls);
    }

    for (const productId of productIds) {
        const productPrefix = `products/${productId}/`;
        if (!existingProducts.has(productId)) {
            const objects = await s3.send(
                new ListObjectsV2Command({
                    Bucket: BUCKET,
                    Prefix: productPrefix,
                })
            );

            if (objects.Contents?.length) {
                await s3.send(
                    new DeleteObjectsCommand({
                        Bucket: BUCKET,
                        Delete: {
                            Objects: objects.Contents.map((o) => ({
                                Key: o.Key!,
                            })),
                        },
                    })
                );
            }

            continue;
        }

        const allowedFiles = new Set(
            existingProducts
                .get(productId)!
                .map((url) => url.split("/").pop())
                .filter((v): v is string => Boolean(v))
        );

        const images = await s3.send(
            new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: `${productPrefix}images/`,
            })
        );

        if (!images.Contents?.length) continue;

        const orphanImages = images.Contents.filter(
            (obj) =>
                obj.Key &&
                obj.LastModified &&
                !allowedFiles.has(
                    obj.Key.split("/").pop()!
                ) &&
                now - obj.LastModified.getTime() >
                SAFE_WINDOW_MS
        );

        if (orphanImages.length) {
            await s3.send(
                new DeleteObjectsCommand({
                    Bucket: BUCKET,
                    Delete: {
                        Objects: orphanImages.map((o) => ({
                            Key: o.Key!,
                        })),
                    },
                })
            );
        }
    }
};