import { verifyJwt } from "../utils/auth";
import { AdminService } from "../services/admin.service";

const adminService = new AdminService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "Forbidden" }),
            };
        }

        const data = await adminService.getDashboard();
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err: any) {
        console.error("Admin dashboard error", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};