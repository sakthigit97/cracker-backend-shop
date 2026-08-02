import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { dbClient } from "../libs/db";
import { success, error } from "../libs/response";
import { withAuth } from "../libs/auth-middleware";

const handler = async (event: any) => {
  const mobile = event.user.sub;
  const body = JSON.parse(event.body || "{}");

  const {
    title,
    name,
    address,
    email,
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
          title = :title,
          address = :address,
          city = :city,
          email = :email,
          #state = :state,
          pincode = :pincode
      `,
      ExpressionAttributeNames: {
        "#name": "name",
        "#state": "state",
      },
      ExpressionAttributeValues: {
        ":title": { S: title },
        ":name": { S: name },
        ":address": { S: address },
        ":city": { S: city || "" },
        ":state": { S: state || "" },
        ":email": { S: email || "" },
        ":pincode": { S: pincode || "" },
      },
    })
  );

  return success({ message: "Profile updated successfully" });
};

export const main = withAuth(handler);