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
    return this.repo.batchGet(uniqueIds);
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
