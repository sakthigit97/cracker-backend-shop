import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { dbClient } from "../libs/db";
import { success, error } from "../libs/response";
import { withAuth } from "../libs/auth-middleware";

const handler = async (event: any) => {
  const mobile = event.user.sub;

  const result = await dbClient.send(
    new GetItemCommand({
      TableName: "Users",
      Key: {
        mobile: { S: mobile },
      },
    })
  );

  if (!result.Item) {
    return error("User not found", 404);
  }

  return success({
    mobile,
    name: result.Item.name?.S,
    address: result.Item.address?.S,
    city: result.Item.city?.S,
    state: result.Item.state?.S,
    pincode: result.Item.pincode?.S,
    role: result.Item.role?.S,
    walletCredit: result.Item.walletCredit?.N || 0,
    referralCode: result.Item.referralCode.S || ''
  });
};

export const main = withAuth(handler);