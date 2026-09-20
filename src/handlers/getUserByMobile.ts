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

        const mobile = event.pathParameters?.mobile;
        if (!mobile?.trim()) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Mobile number is required",
                }),
            };
        }

        const user = await service.getUserByMobile(
            mobile.trim()
        );

        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: "User not found",
                }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(user),
        };
    } catch (err) {
        console.error(
            "AdminGetUserByMobile error",
            err
        );

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};