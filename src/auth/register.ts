import {
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

import { dbClient } from "../libs/db";
import { hashPassword } from "../libs/hash";
import { success, error } from "../libs/response";
import { OtpService } from "../utils/otp.service";

const otpService = new OtpService();

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const {
      mobile,
      otp,
      name,
      password,
      address,
      city,
      state,
      pincode,
      referralCodeUsed,
    } = body;

    const code = referralCodeUsed
      ? referralCodeUsed.trim().toUpperCase()
      : "";

    if (!mobile || !otp || !name || !password || !address) {
      return error("Missing required fields", 400);
    }

    try {
      await otpService.verifyOtp(mobile, otp);
    } catch {
      return error("Invalid OTP", 400);
    }

    const existing = await dbClient.send(
      new GetItemCommand({
        TableName: "Users",
        Key: {
          mobile: { S: mobile },
        },
      })
    );

    if (existing.Item) {
      return error("User already registered", 409);
    }

    const configRes = await dbClient.send(
      new GetItemCommand({
        TableName: "AdminConfig",
        Key: {
          configId: { S: "global" },
        },
      })
    );

    const config = configRes.Item || {};

    const isReferralEnabled =
      config.isReferralEnabled?.BOOL === true;

    const isJoinBonusEnabled =
      config.isJoinBonusEnabled?.BOOL === true;

    const joinBonusAmount = config.joinBonusAmount?.N
      ? Number(config.joinBonusAmount.N)
      : 0;

    const initialCredit = isJoinBonusEnabled
      ? joinBonusAmount
      : 0;

    let referredBy = "";
    if (code && isReferralEnabled) {
      const referralCheck = await dbClient.send(
        new ScanCommand({
          TableName: "Users",
          FilterExpression: "referralCode = :code",
          ExpressionAttributeValues: {
            ":code": { S: code },
          },
          Limit: 1,
        })
      );

      if (!referralCheck.Items || referralCheck.Items.length === 0) {
        return error("Invalid referral code", 400);
      }

      const refUser = referralCheck.Items[0];
      if (refUser.mobile?.S === mobile) {
        return error("You cannot use your own referral code", 400);
      }

      referredBy = code;
    }

    const myReferralCode = "CRK" + Math.floor(100000 + Math.random() * 900000);
    const passwordHash = await hashPassword(password);
    await dbClient.send(
      new PutItemCommand({
        TableName: "Users",
        Item: {
          mobile: { S: mobile },
          name: { S: name },
          passwordHash: { S: passwordHash },
          role: { S: "user" },
          address: { S: address },
          city: { S: city || "" },
          state: { S: state || "" },
          pincode: { S: pincode || "" },
          referralCode: { S: myReferralCode },
          referredBy: { S: referredBy },
          walletCredit: { N: String(initialCredit) },
          referralRewarded: { BOOL: false },
          createdAt: { S: new Date().toISOString() },
        },
      })
    );

    return success({
      message: "Registration successful. Please login.",
      referralCode: myReferralCode,
    });
  } catch (err) {
    console.error("Registration failed", err);
    return error("Registration failed", 500);
  }
};