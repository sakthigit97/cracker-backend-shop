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

// src/handlers/estimateEmail.ts
var estimateEmail_exports = {};
__export(estimateEmail_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(estimateEmail_exports);

// src/utils/email.service.ts
var EmailService = class {
  async send(input) {
    console.log("EMAIL MOCK SENT");
    console.log("To:", input.to);
    console.log("Subject:", input.subject);
    console.log("Message:", input.message);
    return {
      success: true,
      provider: "MOCK"
    };
  }
  async sendEstimate(input) {
    const body = {
      recipients: [
        {
          to: [
            {
              email: input.to,
              name: "Admin"
            }
          ],
          variables: {
            USERNAME: input.customerName,
            PHONE_NUMBER: input.mobile
          }
        }
      ],
      from: {
        name: "Sivakasi Pyro Park",
        email: process.env.MSG91_EMAIL_FROM
      },
      domain: process.env.MSG91_EMAIL_DOMAIN,
      attachments: [
        {
          file: `data:application/pdf;base64,${input.pdfBase64}`,
          fileName: `Estimate-${input.customerName.replace(/\s+/g, "-")}-${input.mobile}.pdf`
        }
      ],
      template_id: process.env.MSG91_ESTIMATE_TEMPLATE
    };
    const response = await fetch(
      "https://control.msg91.com/api/v5/email/send",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          authkey: process.env.MSG91_AUTH_KEY
        },
        body: JSON.stringify(body)
      }
    );
    const result = await response.json();
    if (!response.ok) {
      console.error(result);
      throw new Error(result?.message || "Unable to send estimate email");
    }
    console.log("Estimate email sent", result);
    return result;
  }
};

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

// src/handlers/estimateEmail.ts
var handler = async (event) => {
  const emailService = new EmailService();
  const repo = new AdminConfigRepo();
  const service = new AdminConfigService(repo);
  const config = await service.getConfig();
  try {
    const body = JSON.parse(event.body || "{}");
    await emailService.sendEstimate({
      to: config.adminEmail || "sakthiamsv97@gmail.com",
      customerName: body.customerName,
      mobile: body.mobile,
      pdfBase64: body.pdfBase64
    });
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true
      })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: err.message || "Unable to send estimate email"
      })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=estimateEmail.js.map
