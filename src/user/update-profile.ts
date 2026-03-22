import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { dbClient } from "../libs/db";
import { success, error } from "../libs/response";
import { withAuth } from "../libs/auth-middleware";

const handler = async (event: any) => {
  const mobile = event.user.sub;
  const body = JSON.parse(event.body || "{}");

  const {
    name,
    address,
    city,
    state,
    pincode,
  } = body;

  if (!name || !address) {
    return error("Name and address are required", 400);
  }

  await dbClient.send(
    new UpdateItemCommand({
      TableName: "Users",
      Key: {
        mobile: { S: mobile },
      },
      UpdateExpression: `
        SET
          #name = :name,
          address = :address,
          city = :city,
          #state = :state,
          pincode = :pincode
      `,
      ExpressionAttributeNames: {
        "#name": "name",
        "#state": "state",
      },
      ExpressionAttributeValues: {
        ":name": { S: name },
        ":address": { S: address },
        ":city": { S: city || "" },
        ":state": { S: state || "" },
        ":pincode": { S: pincode || "" },
      },
    })
  );

  return success({ message: "Profile updated successfully" });
};

export const main = withAuth(handler);