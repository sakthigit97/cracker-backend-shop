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

// src/handlers/getAllProducts.ts
var getAllProducts_exports = {};
__export(getAllProducts_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getAllProducts_exports);

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

// src/services/discount.service.ts
var import_lib_dynamodb3 = require("@aws-sdk/lib-dynamodb");
var DISCOUNT_TABLE = process.env.DISCOUNT_TABLE;
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
    finalPrice = Math.max(
      0,
      product.price - applied.discountValue
    );
  }
  return {
    price: finalPrice,
    originalPrice: product.price,
    discountText: applied.discountMode === "PERCENT" ? `${applied.discountValue}% OFF` : `\u20B9${applied.discountValue} OFF`
  };
}

// src/services/product.service.ts
var PRODUCT_TABLE = process.env.PRODUCTS_TABLE;
async function getAllActiveProducts() {
  const items = [];
  let lastKey = void 0;
  do {
    const res = await ddb.send(
      new import_lib_dynamodb4.QueryCommand({
        TableName: PRODUCT_TABLE,
        IndexName: "isActive-index",
        KeyConditionExpression: "isActive = :true",
        ExpressionAttributeValues: {
          ":true": "true"
        },
        ExclusiveStartKey: lastKey
      })
    );
    items.push(...res.Items || []);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items.filter((p) => Number(p.quantity) > 0);
}

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

// src/handlers/getAllProducts.ts
var handler = async () => {
  try {
    const [items, discounts] = await Promise.all([
      getAllActiveProducts(),
      getActiveDiscounts()
    ]);
    const products = items.map((p) => {
      const priceInfo = applyDiscount(p, discounts);
      return {
        id: p.productId,
        name: p.name,
        image: p.imageUrls?.[0] ?? null,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice,
        discountText: priceInfo.discountText,
        categoryId: p.categoryId,
        brandId: p.brandId,
        qty: p.quantity,
        searchText: p.searchText,
        isComboPackage: p.isComboPackage || false,
        sequenceNumber: p.sequenceNumber || 0,
        isBulkOnly: p.isBulkOnly || false,
        cartonQty: p.cartonQty || 0,
        bulkOrderBasePrice: p.bulkOrderBasePrice || 0,
        isBulkOrderOnly: p.isBulkOrderOnly || false,
        isRetailOnly: p.isRetailOnly || false,
        productPer: p.productPer || 0,
        productMeasurement: p.productMeasurement || ""
      };
    });
    return success({
      items: products,
      pagination: {
        nextCursor: null
      }
    });
  } catch (err) {
    console.error("getAllProducts error:", err);
    return error("Failed to fetch products", 500);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getAllProducts.js.map
