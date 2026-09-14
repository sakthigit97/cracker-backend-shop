import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

const TABLE = process.env.PRODUCTS_TABLE!;

export class AdminGetComboPackagesRepository {
    async listComboProducts() {
        const items: any[] = [];

        let ExclusiveStartKey:
            | Record<string, any>
            | undefined = undefined;

        do {
            const result: any = await ddb.send(
                new ScanCommand({
                    TableName: TABLE,
                    ExclusiveStartKey,
                })
            );

            const comboProducts = (result.Items || []).filter(
                (item: any) => item.isComboPackage === true
            );

            items.push(...comboProducts);

            ExclusiveStartKey = result.LastEvaluatedKey;
        } while (ExclusiveStartKey);

        return items;
    }

    async listAllProducts() {
        const items: any[] = [];

        let ExclusiveStartKey:
            | Record<string, any>
            | undefined = undefined;

        do {
            const result: any = await ddb.send(
                new ScanCommand({
                    TableName: TABLE,
                    ExclusiveStartKey,
                })
            );

            items.push(...(result.Items || []));

            ExclusiveStartKey = result.LastEvaluatedKey;
        } while (ExclusiveStartKey);

        return items;
    }
}