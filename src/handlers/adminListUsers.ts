import { verifyJwt } from "../utils/auth";
import { AdminUserService } from "../services/adminUser.service";

const service = new AdminUserService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const query = event.queryStringParameters || {};

        const search = query.search || "";
        const isActive = query.isActive as "true" | "false" | undefined;
        const cursor = query.cursor;
        const limit = query.limit ? Number(query.limit) : 20;

        const data = await service.listUsers({
            search,
            isActive,
            cursor,
            limit,
        });

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error("AdminListUsers error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};