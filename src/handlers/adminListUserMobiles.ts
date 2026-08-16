import { verifyJwt } from "../utils/auth";
import { AdminUserService } from "../services/adminUser.service";

const service = new AdminUserService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const mobiles = await service.listUserMobiles();

        return {
            statusCode: 200,
            body: JSON.stringify({
                items: mobiles,
            }),
        };
    } catch (err) {
        console.error(
            "AdminListUserMobiles error",
            err
        );

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};