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

// src/handlers/getProductDetails.ts
var getProductDetails_exports = {};
__export(getProductDetails_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getProductDetails_exports);
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

// src/handlers/getProductDetails.ts
var handler = async (event) => {
  try {
    const productId = event.pathParameters?.productId;
    if (!productId) {
      return error("productId is required", 400);
    }
    const productRes = await ddb.send(
      new import_lib_dynamodb3.GetCommand({
        TableName: "Products",
        Key: {
          productId
        }
      })
    );
    if (!productRes.Item || productRes.Item.isActive !== "true") {
      return error("Product not found", 404);
    }
    const discounts = await getActiveDiscounts();
    const priceInfo = applyDiscount(productRes.Item, discounts);
    const product = {
      id: productRes.Item.productId,
      name: productRes.Item.name,
      description: productRes.Item.description ?? null,
      images: productRes.Item.imageUrls ?? [],
      price: priceInfo.price,
      originalPrice: priceInfo.originalPrice,
      discountText: priceInfo.discountText,
      categoryId: productRes.Item.categoryId,
      brandId: productRes.Item.brandId,
      youtubeUrl: productRes.Item.videoUrl ?? null
    };
    return success(product);
  } catch (err) {
    console.error("getProductDetails error:", err);
    return error("Failed to fetch product details", 500);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getProductDetails.js.map
