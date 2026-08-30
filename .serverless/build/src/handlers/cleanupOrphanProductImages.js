"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/handlers/cleanupOrphanProductImages.ts
var cleanupOrphanProductImages_exports = {};
__export(cleanupOrphanProductImages_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(cleanupOrphanProductImages_exports);
var import_client_s3 = require("@aws-sdk/client-s3");
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var s3 = new import_client_s3.S3Client({ region: process.env.AWS_REGION });
var ddb = new import_client_dynamodb.DynamoDBClient({ region: process.env.AWS_REGION });
var BUCKET = process.env.BUCKET_NAME;
var TABLE = process.env.PRODUCTS_TABLE;
var SAFE_WINDOW_MS = 24 * 60 * 60 * 1e3;
var handler = async () => {
  const now = Date.now();
  const list = await s3.send(
    new import_client_s3.ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: "products/",
      Delimiter: "/"
    })
  );
  const productIds = list.CommonPrefixes?.map(
    (p) => p.Prefix?.split("/")[1]
  ).filter((v) => Boolean(v)) || [];
  if (!productIds.length) return;
  const keys = productIds.map((id) => ({
    productId: { S: id }
  }));
  const dbRes = await ddb.send(
    new import_client_dynamodb.BatchGetItemCommand({
      RequestItems: {
        [TABLE]: {
          Keys: keys,
          ProjectionExpression: "productId, imageUrls"
        }
      }
    })
  );
  const dbItems = dbRes.Responses?.[TABLE] || [];
  const existingProducts = /* @__PURE__ */ new Map();
  for (const item of dbItems) {
    const productId = item.productId?.S;
    if (!productId) continue;
    const imageUrls = item.imageUrls?.L?.map((v) => v.S).filter((v) => Boolean(v)) || [];
    existingProducts.set(productId, imageUrls);
  }
  for (const productId of productIds) {
    const productPrefix = `products/${productId}/`;
    if (!existingProducts.has(productId)) {
      const objects = await s3.send(
        new import_client_s3.ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: productPrefix
        })
      );
      if (objects.Contents?.length) {
        await s3.send(
          new import_client_s3.DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: {
              Objects: objects.Contents.map((o) => ({
                Key: o.Key
              }))
            }
          })
        );
      }
      continue;
    }
    const allowedFiles = new Set(
      existingProducts.get(productId).map((url) => url.split("/").pop()).filter((v) => Boolean(v))
    );
    const images = await s3.send(
      new import_client_s3.ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${productPrefix}images/`
      })
    );
    if (!images.Contents?.length) continue;
    const orphanImages = images.Contents.filter(
      (obj) => obj.Key && obj.LastModified && !allowedFiles.has(
        obj.Key.split("/").pop()
      ) && now - obj.LastModified.getTime() > SAFE_WINDOW_MS
    );
    if (orphanImages.length) {
      await s3.send(
        new import_client_s3.DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: {
            Objects: orphanImages.map((o) => ({
              Key: o.Key
            }))
          }
        })
      );
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=cleanupOrphanProductImages.js.map
