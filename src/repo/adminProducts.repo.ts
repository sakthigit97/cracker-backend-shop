import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.PRODUCTS_TABLE!;
interface FetchParams {
    brandId?: string;
    categoryId?: string;
    isActive?: string;
    search?: string;
    limit: number;
    cursor?: any;
}

type BaseFilter = "brandId" | "categoryId" | "isActive" | "none";
export class AdminProductsRepository {
    async fetchProducts(params: FetchParams) {
        const {
            brandId,
            categoryId,
            isActive,
            search,
            limit,
            cursor,
        } = params;

        let command;
        let baseFilter: BaseFilter = "none";

        if (brandId) {
            baseFilter = "brandId";
            command = new QueryCommand({
                TableName: TABLE,
                IndexName: "brandId-index",
                KeyConditionExpression: "brandId = :bid",
                ExpressionAttributeValues: {
                    ":bid": brandId,
                },
                Limit: limit,
                ExclusiveStartKey: cursor,
            });
        } else if (categoryId) {
            baseFilter = "categoryId";
            command = new QueryCommand({
                TableName: TABLE,
                IndexName: "categoryId-index",
                KeyConditionExpression: "categoryId = :cid",
                ExpressionAttributeValues: {
                    ":cid": categoryId,
                },
                Limit: limit,
                ExclusiveStartKey: cursor,
            });
        } else if (isActive) {
            baseFilter = "isActive";
            command = new QueryCommand({
                TableName: TABLE,
                IndexName: "isActive-index",
                KeyConditionExpression: "isActive = :ia",
                ExpressionAttributeValues: {
                    ":ia": isActive,
                },
                Limit: limit,
                ExclusiveStartKey: cursor,
            });
        } else {
            command = new ScanCommand({
                TableName: TABLE,
                Limit: limit,
                ExclusiveStartKey: cursor,
            });
        }

        const filterExpressions: string[] = [];
        const names: Record<string, string> = {};
        const values: Record<string, any> = {
            ...(command.input.ExpressionAttributeValues || {}),
        };

        if (brandId && baseFilter !== "brandId") {
            filterExpressions.push("#brandId = :brandId");
            names["#brandId"] = "brandId";
            values[":brandId"] = brandId;
        }

        if (categoryId && baseFilter !== "categoryId") {
            filterExpressions.push("#categoryId = :categoryId");
            names["#categoryId"] = "categoryId";
            values[":categoryId"] = categoryId;
        }

        if (isActive && baseFilter !== "isActive") {
            filterExpressions.push("#isActive = :isActive");
            names["#isActive"] = "isActive";
            values[":isActive"] = isActive;
        }

        if (search) {
            filterExpressions.push("contains(#st, :q)");
            names["#st"] = "searchText";
            values[":q"] = search.trim();
        }

        if (filterExpressions.length) {
            command.input.FilterExpression = filterExpressions.join(" AND ");
            command.input.ExpressionAttributeNames = {
                ...(command.input.ExpressionAttributeNames || {}),
                ...names,
            };
            command.input.ExpressionAttributeValues = values;
        }

        const res = await ddb.send(command);

        return {
            items: res.Items || [],
            nextCursor: res.LastEvaluatedKey
                ? Buffer.from(
                    JSON.stringify(res.LastEvaluatedKey),
                    "utf8"
                ).toString("base64")
                : null,
        };
    }
}