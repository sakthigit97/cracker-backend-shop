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

// src/handlers/popularProducts.ts
var popularProducts_exports = {};
__export(popularProducts_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(popularProducts_exports);

// src/repo/popularProducts.repo.ts
var import_lib_dynamodb5 = require("@aws-sdk/lib-dynamodb");

// src/utils/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var ddb = import_lib_dynamodb.DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

// src/services/product.service.ts
var import_lib_dynamodb4 = require("@aws-sdk/lib-dynamodb");

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

// src/repo/popularProducts.repo.ts
var ORDERS_TABLE = process.env.ORDERS_TABLE;
var PopularProductsRepository = class {
  constructor() {
    this.productService = new ProductService();
  }
  async getPopularProducts(limit) {
    let lastKey = void 0;
    const productCount = {};
    do {
      const res = await ddb.send(
        new import_lib_dynamodb5.QueryCommand({
          TableName: ORDERS_TABLE,
          IndexName: "status-meta-index",
          KeyConditionExpression: "#status = :s AND #meta = :m",
          ExpressionAttributeNames: {
            "#status": "status",
            "#meta": "meta"
          },
          ExpressionAttributeValues: {
            ":s": "DISPATCHED",
            ":m": "ORDER"
          },
          Limit: 50,
          ExclusiveStartKey: lastKey
        })
      );
      const orders = res.Items || [];
      for (const order of orders) {
        const items = order.items || [];
        for (const item of items) {
          const productId = item.productId;
          const qty = Number(item.quantity || 1);
          if (!productId) continue;
          productCount[productId] = (productCount[productId] || 0) + qty;
        }
      }
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    const topProductIds = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([productId]) => productId);
    if (topProductIds.length === 0) {
      return { items: [] };
    }
    const products = await this.productService.batchGetProducts(topProductIds);
    return {
      items: products
    };
  }
};

// src/services/popularProducts.service.ts
var PopularProductsService = class {
  constructor(repo = new PopularProductsRepository()) {
    this.repo = repo;
  }
  async getPopularProducts(input) {
    return this.repo.getPopularProducts(input.limit);
  }
};

// src/libs/response.ts
var success = (data, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify({
    success: true,
    data
  })
});
var error = (message, statusCode = 400) => ({
  statusCode,
  body: JSON.stringify({
    success: false,
    message
  })
});

// src/handlers/popularProducts.ts
var service = new PopularProductsService();
var handler = async () => {
  try {
    const limit = 10;
    const [{ items }, discounts] = await Promise.all([
      service.getPopularProducts({ limit }),
      getActiveDiscounts()
    ]);
    const products = items.map((p) => {
      const priceInfo = applyDiscount(p, discounts);
      return {
        id: p.productId,
        name: p.name,
        image: p.imageUrls?.[0] ?? p.image ?? null,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice > priceInfo.price ? priceInfo.originalPrice : void 0,
        discountText: priceInfo.discountText,
        categoryId: p.categoryId,
        brandId: p.brandId,
        qty: p.quantity ?? p.qty
      };
    });
    return success({
      items: products
    });
  } catch (err) {
    console.error(err);
    return error("Failed to fetch popular products", 500);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=popularProducts.js.map
