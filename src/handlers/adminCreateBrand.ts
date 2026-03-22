import { verifyJwt } from "../utils/auth";
import { AdminBrandService } from "../services/adminBrand.service";

const service = new AdminBrandService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const body = JSON.parse(event.body || "{}");

        if (!body.name || !body.logoUrl) {
            return { statusCode: 400, body: "name and logoUrl required" };
        }

        const created = await service.createBrand({
            name: body.name,
            logoUrl: body.logoUrl,
            isActive: body.isActive ?? true,
        });

        return {
            statusCode: 200,
            body: JSON.stringify(created),
        };
    } catch (err) {
        console.error("CreateBrand error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};