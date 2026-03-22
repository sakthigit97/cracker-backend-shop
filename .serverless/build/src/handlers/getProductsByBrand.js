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

// src/handlers/getProductsByBrand.ts
var getProductsByBrand_exports = {};
__export(getProductsByBrand_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getProductsByBrand_exports);
var import_lib_dynamodb3 = require("@aws-sdk/lib-dynamodb");

// src/utils/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var ddb = import_lib_dynamodb.DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

// src/services/discount.service.ts
var import_lib_dynamodb2 = require("@aws-sdk/lib-dynamodb");
var DISCOUNT_TABLE = "Discounts";
async function getActiveDiscounts() {
  const res = await ddb.send(
    new import_lib_dynamodb2.ScanCommand({
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

// src/handlers/getProductsByBrand.ts
var handler = async (event) => {
  try {
    const brandId = event.pathParameters?.brandId;
    if (!brandId) {
      return error("brandId is required", 400);
    }
    const limit = Math.min(
      Number(event.queryStringParameters?.limit) || 8,
      50
    );
    const cursor = decodeCursor(
      event.queryStringParameters?.cursor
    );
    const [res, discounts] = await Promise.all([
      ddb.send(
        new import_lib_dynamodb3.QueryCommand({
          TableName: "Products",
          IndexName: "brandId-index",
          KeyConditionExpression: "brandId = :bid",
          FilterExpression: "isActive = :active",
          ExpressionAttributeValues: {
            ":bid": brandId,
            ":active": "true"
          },
          Limit: limit,
          ExclusiveStartKey: cursor
        })
      ),
      getActiveDiscounts()
    ]);
    const products = res.Items?.map((p) => {
      const priceInfo = applyDiscount(p, discounts);
      return {
        id: p.productId,
        name: p.name,
        image: p.imageUrls?.[0] ?? null,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice,
        discountText: priceInfo.discountText,
        categoryId: p.categoryId,
        brandId: p.brandId
      };
    }) || [];
    return success({
      items: products,
      pagination: {
        nextCursor: encodeCursor(res.LastEvaluatedKey)
      }
    });
  } catch (err) {
    console.error("getProductsByBrand error:", err);
    return error("Failed to fetch brand products", 500);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getProductsByBrand.js.map
