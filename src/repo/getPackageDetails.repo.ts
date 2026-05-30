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

        const productsRes = await ddb.send(
            new ScanCommand({
                TableName: "Products",
                ProjectionExpression:
                    "productId, packageTagIds",
            })
        );

        const products = productsRes.Items || [];
        const productIds = products
            .filter((p: any) =>
                p.packageTagIds?.includes(
                    packageId
                )
            )
            .map(
                (p: any) => p.productId
            );

        return {
            package: packageInfo,
            productIds,
        };
    }
}