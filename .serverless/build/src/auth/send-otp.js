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
var import_client_dynamodb2 = require("@aws-sdk/client-dynamodb");

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
var OtpService = class _OtpService {
  static {
    this.MOCK_OTP = "123456";
  }
  async sendOtp(mobile) {
    return {
      success: true,
      message: "OTP sent successfully"
    };
  }
  async verifyOtp(mobile, otp) {
    if (otp !== _OtpService.MOCK_OTP) {
      throw new Error("Invalid OTP");
    }
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
      new import_client_dynamodb2.GetItemCommand({
        TableName: "Users",
        Key: {
          mobile: { S: mobile }
        }
      })
    );
    if (existing.Item) {
      return error("User already registered", 409);
    }
    await otpService.sendOtp(mobile);
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
