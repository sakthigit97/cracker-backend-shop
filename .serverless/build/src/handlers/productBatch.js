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

// src/handlers/productBatch.ts
var productBatch_exports = {};
__export(productBatch_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(productBatch_exports);

// src/services/product.service.ts
var import_lib_dynamodb4 = require("@aws-sdk/lib-dynamodb");

// src/utils/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var ddb = import_lib_dynamodb.DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

// src/repo/product.repo.ts
var import_lib_dynamodb2 = require("@aws-sdk/lib-dynamodb");
var TABLE_NAME = process.env.PRODUCTS_TABLE;
var ProductRepository = class {
  async batchGet(productIds) {
    if (productIds.length === 0) return [];
    const keys = productIds.map((productId) => ({
      productId
    }));
    const res = await ddb.send(
      new import_lib_dynamodb2.BatchGetCommand({
        RequestItems: {
          [TABLE_NAME]: { Keys: keys }
        }
      })
    );
    return res.Responses?.[TABLE_NAME] ?? [];
  }
  async deleteProduct(productId) {
    await ddb.send(
      new import_lib_dynamodb2.DeleteCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Key: { productId }
      })
    );
  }
};

// src/services/discount.service.ts
var import_lib_dynamodb3 = require("@aws-sdk/lib-dynamodb");
var DISCOUNT_TABLE = "Discounts";
async function getActiveDiscounts() {
  const res = await ddb.send(
    new import_lib_dynamodb3.ScanCommand({
      TableName: DISCOUNT_TABLE,
      FilterExpression: "isActive = :true",
      ExpressionAttributeValues: {
        ":true": true
      }
    })
  );
  return res.Items || [];
}

// src/services/price.service.ts
function applyDiscount(product, discounts) {
  let applied = null;
  applied = discounts.find(
    (d) => d.discountType === "PRODUCT" && d.targetId === product.productId
  ) || discounts.find(
    (d) => d.discountType === "CATEGORY" && d.targetId === product.categoryId
  ) || discounts.find(
    (d) => d.discountType === "BRAND" && d.targetId === product.brandId
  );
  if (!applied) {
    return {
      price: product.price,
      originalPrice: null,
      discountText: null
    };
  }
  let finalPrice = product.price;
  if (applied.discountMode === "PERCENT") {
    finalPrice = Math.round(
      product.price - product.price * applied.discountValue / 100
    );
  }
  if (applied.discountMode === "FLAT") {
    finalPrice = product.price - applied.discountValue;
  }
  return {
    price: finalPrice,
    originalPrice: product.price,
    discountText: applied.discountMode === "PERCENT" ? `${applied.discountValue}% OFF` : `\u20B9${applied.discountValue} OFF`
  };
}

// src/services/product.service.ts
var PRODUCT_TABLE = process.env.PRODUCTS_TABLE;
var ProductService = class {
  constructor(repo = new ProductRepository()) {
    this.repo = repo;
  }
  async batchGetProducts(productIds) {
    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length > 100) {
      throw new Error("Too many products requested");
    }
    const products = await this.repo.batchGet(uniqueIds);
    if (!products || products.length === 0) return [];
    const discounts = await getActiveDiscounts();
    const productMap = new Map(products.map((p) => [p.productId, p]));
    return uniqueIds.map((id) => productMap.get(id)).filter((p) => Boolean(p)).filter((p) => p.isActive === "true" || p.isActive === true).map((p) => {
      const priceInfo = applyDiscount(p, discounts);
      return {
        productId: p.productId,
        name: p.name,
        description: p.description ?? null,
        image: p.imageUrls?.[0] ?? null,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice > priceInfo.price ? priceInfo.originalPrice : void 0,
        discountText: priceInfo.discountText,
        categoryId: p.categoryId,
        brandId: p.brandId,
        qty: p.quantity
      };
    });
  }
  async deleteProduct(productId) {
    return this.repo.deleteProduct(productId);
  }
};

// src/handlers/productBatch.ts
var service = new ProductService();
var handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const productIds = body.productIds;
    if (!Array.isArray(productIds)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "productIds must be an array"
        })
      };
    }
    const items = await service.batchGetProducts(productIds);
    return {
      statusCode: 200,
      body: JSON.stringify({ items })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err.message || "Internal error"
      })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=productBatch.js.map
