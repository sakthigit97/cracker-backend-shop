import { verifyJwt } from "../utils/auth";
import { AdminUserService } from "../services/adminUser.service";

const service = new AdminUserService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const userId = event.pathParameters?.userId;
        if (!userId) {
            return { statusCode: 400, body: "userId is required" };
        }

        await service.deleteUser(userId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "User deleted successfully",
            }),
        };
    } catch (err) {
        console.error("AdminDeleteUser error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};