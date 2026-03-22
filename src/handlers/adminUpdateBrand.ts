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

        const body = JSON.parse(event.body || "{}");

        await service.updateBrand(brandId, {
            name: body.name,
            logoUrl: body.logoUrl,
            isActive: body.isActive,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (err) {
        console.error("UpdateBrand error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};