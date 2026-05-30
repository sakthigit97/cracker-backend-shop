import { GetPackageDetailsService } from "../services/getPackageDetails.service";
const service = new GetPackageDetailsService();

export const handler = async (event: any) => {
    try {
        const packageId = event.pathParameters?.packageId;

        if (!packageId) {
            return {
                statusCode: 400,
                body: "packageId required",
            };
        }

        const data = await service.getPackageDetails(packageId);
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error(
            "GetPackageDetails error",
            err
        );

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};