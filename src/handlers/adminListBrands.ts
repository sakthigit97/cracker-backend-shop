import { verifyJwt } from "../utils/auth";
import { AdminBrandService } from "../services/adminBrand.service";

const service = new AdminBrandService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const data = await service.listBrands();
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error("ListBrands error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};