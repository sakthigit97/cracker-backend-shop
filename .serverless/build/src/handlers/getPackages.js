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

// src/handlers/getPackages.ts
var getPackages_exports = {};
__export(getPackages_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getPackages_exports);

// src/repo/getPackages.repo.ts
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

// src/repo/getPackages.repo.ts
var PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
var ADMIN_CONFIG_TABLE = process.env.ADMIN_CONFIG_TABLE;
var GetPackagesRepository = class {
  async getPackages() {
    const config = await ddb.send(
      new import_lib_dynamodb2.GetCommand({
        TableName: ADMIN_CONFIG_TABLE,
        Key: {
          configId: "global"
        }
      })
    );
    const packageTags = config.Item?.packageTags || [];
    const productsRes = await ddb.send(
      new import_lib_dynamodb2.ScanCommand({
        TableName: PRODUCTS_TABLE
      })
    );
    const products = productsRes.Items || [];
    return packageTags.map((pkg) => ({
      ...pkg,
      productCount: products.filter(
        (p) => p.packageTagIds?.includes(pkg.id)
      ).length
    }));
  }
};

// src/services/getPackages.service.ts
var GetPackagesService = class {
  constructor(repo = new GetPackagesRepository()) {
    this.repo = repo;
  }
  async getPackages() {
    return this.repo.getPackages();
  }
};

// src/handlers/getPackages.ts
var service = new GetPackagesService();
var handler = async () => {
  try {
    const data = await service.getPackages();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("GetPackages error", err);
    return {
      statusCode: 500,
      body: "Internal Server Error"
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getPackages.js.map
