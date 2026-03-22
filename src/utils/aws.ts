import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const s3 = new S3Client({
    region: process.env.REGION,
});

const ddbClient = new DynamoDBClient({
    region: process.env.REGION,
});

export const ddb = DynamoDBDocumentClient.from(ddbClient);