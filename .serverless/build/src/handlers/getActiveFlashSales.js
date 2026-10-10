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

// src/handlers/getActiveFlashSales.ts
var getActiveFlashSales_exports = {};
__export(getActiveFlashSales_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getActiveFlashSales_exports);

// src/services/flashSale.service.ts
var import_lib_dynamodb2 = require("@aws-sdk/lib-dynamodb");

// src/utils/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var ddb = import_lib_dynamodb.DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

// src/services/flashSale.service.ts
var FLASH_SALES_TABLE = process.env.FLASH_SALES_TABLE;
var PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
async function getFlashSalesByStatus(status) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await ddb.send(
      new import_lib_dynamodb2.QueryCommand({
        TableName: FLASH_SALES_TABLE,
        IndexName: "status-endAt-index",
        KeyConditionExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":status": status
        },
        ExclusiveStartKey
      })
    );
    items.push(
      ...result.Items ?? []
    );
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}
async function listActiveFlashSales() {
  return getFlashSalesByStatus("ACTIVE");
}

// src/handlers/getActiveFlashSales.ts
var handler = async () => {
  try {
    const items = await listActiveFlashSales();
    return {
      statusCode: 200,
      body: JSON.stringify({
        items
      })
    };
  } catch (error) {
    console.error(
      "Get active flash sales failed",
      error
    );
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error?.message || "Unable to fetch flash sales"
      })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getActiveFlashSales.js.map
