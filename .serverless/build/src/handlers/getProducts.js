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

// src/handlers/getProducts.ts
var getProducts_exports = {};
__export(getProducts_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getProducts_exports);

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
async function getActiveProducts(limit, lastKey, search) {
  const params = {
    TableName: PRODUCT_TABLE,
    IndexName: "isActive-index",
    KeyConditionExpression: "isActive = :true",
    ExpressionAttributeValues: {
      ":true": "true"
    },
    Limit: limit,
    ExclusiveStartKey: lastKey
  };
  if (search) {
    params.FilterExpression = "contains(#st, :q)";
    params.ExpressionAttributeNames = {
      "#st": "searchText"
    };
    params.ExpressionAttributeValues[":q"] = search;
  }
  const res = await ddb.send(new import_lib_dynamodb4.QueryCommand(params));
  return {
    items: res.Items || [],
    lastKey: res.LastEvaluatedKey
  };
}

// src/libs/pagination.ts
function encodeCursor(key) {
  if (!key) return null;
  return Buffer.from(JSON.stringify(key)).toString("base64");
}
function decodeCursor(cursor) {
  if (!cursor) return void 0;
  try {
    return JSON.parse(
      Buffer.from(cursor, "base64").toString("utf-8")
    );
  } catch {
    return void 0;
  }
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

// src/handlers/getProducts.ts
var handler = async (event) => {
  try {
    const limit = Math.min(
      Number(event.queryStringParameters?.limit) || 20,
      50
    );
    const search = event.queryStringParameters?.search?.trim();
    const cursor = decodeCursor(
      event.queryStringParameters?.cursor
    );
    const [{ items, lastKey }, discounts] = await Promise.all([
      getActiveProducts(limit, cursor, search),
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
        qty: p.quantity
      };
    });
    return success({
      items: products,
      pagination: {
        nextCursor: encodeCursor(lastKey)
      }
    });
  } catch (err) {
    console.error("getProducts error:", err);
    return error("Failed to fetch products", 500);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getProducts.js.map
