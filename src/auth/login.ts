import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { dbClient } from "../libs/db";
import { comparePassword } from "../libs/hash";
import { generateToken } from "../libs/jwt";
import { success, error } from "../libs/response";

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { mobile, password } = body;

    if (!mobile || !password) {
      return error("Mobile and password are required", 400);
    }

    const result = await dbClient.send(
      new GetItemCommand({
        TableName: "Users",
        Key: {
          mobile: { S: mobile },
        },
      })
    );

    if (!result.Item) {
      return error("Invalid credentials", 401);
    }

    const user = {
      mobile: result.Item.mobile.S!,
      name: result.Item.name.S!,
      passwordHash: result.Item.passwordHash.S!,
      role: result.Item.role?.S || "user",
    };

    const isValid = await comparePassword(
      password,
      user.passwordHash
    );

    if (!isValid) {
      return error("Invalid credentials", 401);
    }

    const token = generateToken({
      sub: user.mobile,
      role: user.role,
    });

    return success({
      token,
      user: {
        mobile: user.mobile,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return error("Internal server error", 500);
  }
};