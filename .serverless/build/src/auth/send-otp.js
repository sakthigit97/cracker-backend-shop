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

// src/auth/send-otp.ts
var send_otp_exports = {};
__export(send_otp_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(send_otp_exports);
var import_client_dynamodb3 = require("@aws-sdk/client-dynamodb");

// src/libs/db.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var dbClient = new import_client_dynamodb.DynamoDBClient({
  region: "ap-south-1"
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

// src/utils/otp.service.ts
var import_client_dynamodb2 = require("@aws-sdk/client-dynamodb");
var OtpService = class {
  async sendOtp(mobile, username = "User") {
    const otp = Math.floor(
      1e5 + Math.random() * 9e5
    ).toString();
    const expiryTime = Math.floor(Date.now() / 1e3) + 5 * 60;
    await dbClient.send(
      new import_client_dynamodb2.PutItemCommand({
        TableName: process.env.OTP_TABLE,
        Item: {
          mobile: { S: mobile },
          otp: { S: otp },
          ttl: {
            N: String(expiryTime)
          }
        }
      })
    );
    const payload = {
      template_id: process.env.OTP_TEMPLATE_ID,
      recipients: [
        {
          mobiles: `91${mobile}`,
          OTP: otp,
          USERNAME: username
        }
      ]
    };
    const res = await fetch(
      "https://control.msg91.com/api/v5/flow/",
      {
        method: "POST",
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
    const data = await res.json();
    console.log(data);
    if (!res.ok) {
      console.error(
        "MSG91 Error",
        data
      );
      throw new Error(
        "OTP send failed"
      );
    }
    return {
      success: true
    };
  }
  async verifyOtp(mobile, otp) {
    const res = await dbClient.send(
      new import_client_dynamodb2.GetItemCommand({
        TableName: process.env.OTP_TABLE,
        Key: {
          mobile: { S: mobile }
        }
      })
    );
    if (!res.Item) {
      throw new Error(
        "OTP expired"
      );
    }
    const storedOtp = res.Item.otp.S;
    if (storedOtp !== otp) {
      throw new Error(
        "Invalid OTP"
      );
    }
    await dbClient.send(
      new import_client_dynamodb2.DeleteItemCommand({
        TableName: process.env.OTP_TABLE,
        Key: {
          mobile: { S: mobile }
        }
      })
    );
    return {
      success: true
    };
  }
};

// src/auth/send-otp.ts
var otpService = new OtpService();
var verifyCaptcha = async (token) => {
  const res = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`
    }
  );
  const data = await res.json();
  return data.success;
};
var handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { mobile, captchaToken } = body;
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return error("Enter a valid mobile number", 400);
    }
    if (!captchaToken || !await verifyCaptcha(captchaToken)) {
      return error("Invalid CAPTCHA", 400);
    }
    const existing = await dbClient.send(
      new import_client_dynamodb3.GetItemCommand({
        TableName: "Users",
        Key: {
          mobile: { S: mobile }
        }
      })
    );
    if (existing.Item) {
      return error("User already registered", 409);
    }
    await otpService.sendOtp(mobile, "User");
    return success({
      message: "OTP sent successfully"
    });
  } catch {
    return error("Failed to send OTP", 500);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=send-otp.js.map
