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

// src/handlers/getConfig.ts
var getConfig_exports = {};
__export(getConfig_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getConfig_exports);

// src/repo/adminConfig.repo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({ region: "ap-south-1" });
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client);
var TABLE_NAME = process.env.ADMIN_CONFIG_TABLE;
var AdminConfigRepo = class {
  async getGlobalConfig() {
    const result = await docClient.send(
      new import_lib_dynamodb.GetCommand({
        TableName: TABLE_NAME,
        Key: { configId: "global" }
      })
    );
    return result.Item;
  }
  async updateGlobalConfig(payload) {
    const existing = await this.getGlobalConfig();
    const updatedItem = {
      ...existing || {},
      ...payload,
      configId: "global",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await docClient.send(
      new import_lib_dynamodb.PutCommand({
        TableName: TABLE_NAME,
        Item: updatedItem
      })
    );
    return updatedItem;
  }
};

// src/services/adminConfig.service.ts
var AdminConfigService = class {
  constructor(repo) {
    this.repo = repo;
  }
  async getConfig() {
    const config = await this.repo.getGlobalConfig();
    if (!config) {
      return {
        isPaymentEnabled: false,
        isEmailEnabled: false,
        isSmsEnabled: false,
        maintenanceMode: false,
        sliderImages: []
      };
    }
    const { configId, updatedAt, ...publicConfig } = config;
    return publicConfig;
  }
  async updateConfig(payload) {
    const updated = await this.repo.updateGlobalConfig(payload);
    const { configId, updatedAt, ...publicConfig } = updated;
    return publicConfig;
  }
};

// src/handlers/getConfig.ts
var handler = async () => {
  const repo = new AdminConfigRepo();
  const service = new AdminConfigService(repo);
  const config = await service.getConfig();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=600"
    },
    body: JSON.stringify(config)
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getConfig.js.map
