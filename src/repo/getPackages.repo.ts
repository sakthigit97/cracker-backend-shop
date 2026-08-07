import {
    GetCommand,
    ScanCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;
const ADMIN_CONFIG_TABLE = process.env.ADMIN_CONFIG_TABLE!;
export class GetPackagesRepository {
    async getPackages() {
        const config = await ddb.send(
            new GetCommand({
                TableName: ADMIN_CONFIG_TABLE,
                Key: {
                    configId: "global",
                },
            })
        );

        const packageTags =
            config.Item?.packageTags || [];

        const productsRes = await ddb.send(
            new ScanCommand({
                TableName: PRODUCTS_TABLE,
            })
        );

        const products = productsRes.Items || [];
        return packageTags.map((pkg: any) => ({
            ...pkg,
            productCount: products.filter((p: any) =>
                p.packageTagIds?.includes(pkg.id)
            ).length,
        }));
    }
}