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

// src/handlers/getCategories.ts
var getCategories_exports = {};
__export(getCategories_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getCategories_exports);
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

// src/handlers/getCategories.ts
var handler = async () => {
  try {
    const res = await ddb.send(
      new import_lib_dynamodb2.ScanCommand({
        TableName: "Categories",
        FilterExpression: "isActive = :active",
        ExpressionAttributeValues: {
          ":active": true
        }
      })
    );
    const items = res.Items?.sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    ).map((c) => ({
      id: c.categoryId,
      name: c.name,
      image: c.imageUrl,
      sortOrder: c.sortOrder ?? 0
    })) || [];
    return success({ items });
  } catch (err) {
    console.error("getCategories error:", err);
    return error("Failed to fetch categories", 500);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getCategories.js.map
