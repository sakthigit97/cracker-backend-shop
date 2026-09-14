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

// src/handlers/contactSubmit.ts
var contactSubmit_exports = {};
__export(contactSubmit_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(contactSubmit_exports);
var import_crypto = require("crypto");
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

// src/handlers/contactSubmit.ts
var TABLE = process.env.CONTACT_TABLE;
var handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { name, phone, email, message } = body;
    if (!name || !phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Name and phone required" })
      };
    }
    const item = {
      contactId: `contact-${(0, import_crypto.randomUUID)()}`,
      name,
      phone,
      email: email || "",
      message: message || "",
      status: "NEW",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await ddb.send(
      new import_lib_dynamodb2.PutCommand({
        TableName: TABLE,
        Item: item
      })
    );
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error("ContactUs error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message || "Internel Server Error" })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=contactSubmit.js.map
