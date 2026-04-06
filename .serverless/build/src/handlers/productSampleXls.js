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

// src/handlers/productSampleXls.ts
var productSampleXls_exports = {};
__export(productSampleXls_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(productSampleXls_exports);
var import_client_s3 = require("@aws-sdk/client-s3");
var import_s3_request_presigner = require("@aws-sdk/s3-request-presigner");
var s3 = new import_client_s3.S3Client({ region: "ap-south-1" });
var handler = async () => {
  try {
    const command = new import_client_s3.GetObjectCommand({
      Bucket: "cracker-app",
      Key: "templates/product-import-template.xlsx"
    });
    const url = await (0, import_s3_request_presigner.getSignedUrl)(s3, command, {
      expiresIn: 3600
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ url })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: "Failed to generate URL"
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=productSampleXls.js.map
