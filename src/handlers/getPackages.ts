import { GetPackagesService } from "../services/getPackages.service";
const service = new GetPackagesService();

export const handler = async () => {
    try {
        const data = await service.getPackages();

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error("GetPackages error", err);

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};