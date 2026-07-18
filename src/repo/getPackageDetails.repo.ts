import {
    GetCommand,
    ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../utils/dynamo";

export class GetPackageDetailsRepository {
    async getPackageDetails(
        packageId: string
    ) {
        const config = await ddb.send(
            new GetCommand({
                TableName: "AdminConfig",
                Key: {
                    configId: "global",
                },
            })
        );

        const packageInfo =
            (
                config.Item?.packageTags || []
            ).find(
                (x: any) =>
                    x.id === packageId
            );

        if (!packageInfo) {
            throw new Error(
                "Package not found"
            );
        }

        let lastKey;
        const products: any[] = [];

        do {
            const res: any = await ddb.send(
                new ScanCommand({
                    TableName: "Products",
                    ProjectionExpression: "productId, packageTagIds",
                    ExclusiveStartKey: lastKey,
                })
            );

            products.push(...(res.Items || []));
            lastKey = res.LastEvaluatedKey;
        } while (lastKey);

        const productIds = products
            .filter((p: any) => p.packageTagIds?.includes(packageId))
            .map((p: any) => p.productId);

        return {
            package: packageInfo,
            productIds,
        };
    }
}