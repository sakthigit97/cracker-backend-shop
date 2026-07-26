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

// src/handlers/validateCoupon.ts
var validateCoupon_exports = {};
__export(validateCoupon_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(validateCoupon_exports);

// src/repo/coupon.repo.ts
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

// src/repo/coupon.repo.ts
var TABLE = process.env.COUPONS_TABLE;
var CouponRepository = class {
  async getCoupon(code) {
    const result = await ddb.send(
      new import_lib_dynamodb2.GetCommand({
        TableName: TABLE,
        Key: {
          couponCode: code
        }
      })
    );
    return result.Item;
  }
  async createCoupon(coupon) {
    await ddb.send(
      new import_lib_dynamodb2.PutCommand({
        TableName: TABLE,
        Item: coupon,
        ConditionExpression: "attribute_not_exists(couponCode)"
      })
    );
    return coupon;
  }
  async listCoupons() {
    const result = await ddb.send(
      new import_lib_dynamodb2.ScanCommand({
        TableName: TABLE
      })
    );
    return result.Items ?? [];
  }
  async deleteCoupon(couponCode) {
    await ddb.send(
      new import_lib_dynamodb2.DeleteCommand({
        TableName: TABLE,
        Key: {
          couponCode
        }
      })
    );
  }
};

// src/services/coupon.service.ts
var CouponService = class {
  constructor() {
    this.repo = new CouponRepository();
  }
  async createCoupon(payload) {
    if (!payload.type) {
      throw new Error("Coupon type is required");
    }
    if (payload.value === void 0 || payload.value === null || payload.value <= 0) {
      throw new Error("Coupon value must be greater than zero");
    }
    if (payload.type === "PERCENTAGE" && payload.value > 100) {
      throw new Error("Percentage cannot exceed 100");
    }
    if (!payload.expiryDate) {
      throw new Error("Expiry Date is required");
    }
    if (new Date(payload.expiryDate) <= /* @__PURE__ */ new Date()) {
      throw new Error("Expiry Date must be a future date");
    }
    const couponCode = payload.couponCode?.trim().toUpperCase();
    if (!couponCode) {
      throw new Error("Coupon Code is required");
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const coupon = {
      couponCode,
      description: payload.description ?? "",
      type: payload.type,
      value: payload.value,
      expiryDate: payload.expiryDate,
      createdAt: now,
      updatedAt: now
    };
    return await this.repo.createCoupon(coupon);
  }
  async getCoupons() {
    const coupons = await this.repo.listCoupons();
    return coupons.sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
  async deleteCoupon(couponCode) {
    if (!couponCode) {
      throw new Error("Coupon code is required");
    }
    await this.repo.deleteCoupon(couponCode);
  }
  async validateCoupon(couponCode, orderAmount) {
    if (!couponCode) {
      throw new Error("Coupon Code is required");
    }
    const coupon = await this.repo.getCoupon(
      couponCode.trim().toUpperCase()
    );
    if (!coupon) {
      throw new Error("Invalid Coupon Code");
    }
    if (new Date(coupon.expiryDate) <= /* @__PURE__ */ new Date()) {
      throw new Error("Coupon Expired");
    }
    let discount = 0;
    if (coupon.type === "FLAT") {
      discount = Math.min(coupon.value, orderAmount);
    } else {
      discount = orderAmount * coupon.value / 100;
    }
    discount = Math.round(discount);
    const payable = Math.max(0, orderAmount - discount);
    return {
      couponCode: coupon.couponCode,
      couponType: coupon.type,
      couponValue: coupon.value,
      couponDiscount: discount,
      payable
    };
  }
};

// src/handlers/validateCoupon.ts
var service = new CouponService();
var handler = async (event) => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const subtotal = Number(body.subtotal);
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      throw new Error("Valid subtotal is required");
    }
    const result = await service.validateCoupon(
      body.couponCode,
      subtotal
    );
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result
      })
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: err.message
      })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=validateCoupon.js.map
