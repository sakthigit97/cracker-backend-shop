import {
    GetCommand,
    ScanCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddb } from "../utils/dynamo";

export class GetPackagesRepository {
    async getPackages() {
        const config = await ddb.send(
            new GetCommand({
                TableName: "AdminConfig",
                Key: {
                    configId: "global",
                },
            })
        );

        const packageTags =
            config.Item?.packageTags || [];

        const productsRes = await ddb.send(
            new ScanCommand({
                TableName: "Products",
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