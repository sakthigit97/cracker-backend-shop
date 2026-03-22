import { verifyJwt } from "../utils/auth";
import { AdminBrandService } from "../services/adminBrand.service";

const service = new AdminBrandService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const brandId = event.pathParameters?.brandId;
        if (!brandId) {
            return { statusCode: 400, body: "brandId is required" };
        }

        const brand = await service.getBrandById(brandId);

        if (!brand) {
            return { statusCode: 404, body: "Brand not found" };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(brand),
        };
    } catch (err) {
        console.error("GetBrand error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};