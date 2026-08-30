import {
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

import { dbClient } from "../libs/db";
import { hashPassword } from "../libs/hash";
import { success, error } from "../libs/response";
import { OtpService } from "../utils/otp.service";
const USERS_TABLE = process.env.USERS_TABLE!;
const ADMIN_CONFIG_TABLE = process.env.ADMIN_CONFIG_TABLE!;
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
      district,
      state,
      pincode,
      referralCodeUsed,
    } = body;

    const code = referralCodeUsed ? referralCodeUsed.trim().toUpperCase() : "";

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
        TableName: USERS_TABLE,
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
        TableName: ADMIN_CONFIG_TABLE,
        Key: {
          configId: { S: "global" },
        },
      })
    );

    const config = configRes.Item || {};
    const isReferralEnabled = config.isReferralEnabled?.BOOL === true;
    const isJoinBonusEnabled = config.isJoinBonusEnabled?.BOOL === true;
    const joinBonusAmount = config.joinBonusAmount?.N
      ? Number(config.joinBonusAmount.N)
      : config.joinBonusAmount?.S
        ? Number(config.joinBonusAmount.S)
        : 0;

    const initialCredit = isJoinBonusEnabled ? joinBonusAmount : 0;
    let referredBy = "";
    if (code && isReferralEnabled) {
      let referralCheck;

      try {
        referralCheck = await dbClient.send(
          new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: "referralCode-index",
            KeyConditionExpression:
              "referralCode = :code",
            ExpressionAttributeValues: {
              ":code": { S: code },
            },
            Limit: 1,
          })
        );
      } catch (err) {
        console.error(
          "Referral code validation failed",
          err
        );

        return error(
          "Unable to validate referral code. Please try again.",
          500
        );
      }

      if (
        !referralCheck.Items ||
        referralCheck.Items.length === 0
      ) {
        return error(
          "Invalid referral code or not available",
          400
        );
      }

      const refUser =
        referralCheck.Items[0];

      if (
        refUser.mobile?.S === mobile
      ) {
        return error(
          "You cannot use your own referral code",
          400
        );
      }

      referredBy = code;
    }

    const myReferralCode = "CRK" + Math.floor(100000 + Math.random() * 900000);
    const passwordHash = await hashPassword(password);
    const searchText = [
      name,
      mobile,
      myReferralCode
    ]
      .filter(Boolean)
      .join("  ")
      .toLowerCase();

    await dbClient.send(
      new PutItemCommand({
        TableName: USERS_TABLE,
        Item: {
          mobile: { S: mobile },
          name: { S: name },
          passwordHash: { S: passwordHash },
          role: { S: "user" },
          address: { S: address },
          city: { S: city || "" },
          district: { S: district || "" },
          state: { S: state || "" },
          pincode: { S: pincode || "" },
          referralCode: { S: myReferralCode },
          searchText: { S: searchText },
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