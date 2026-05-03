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

        await service.deleteBrand(brandId);
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (err: any) {
        console.error("DeleteBrand error", err?.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: err?.message || "Internal Server Error",
            })
        };
    }
};