import { DynamoDBClient } from "@aws-sdk/client-dynamodb";


const REGION = process.env.AWS_REGION;
export const dbClient = new DynamoDBClient({
  region: REGION,
});
