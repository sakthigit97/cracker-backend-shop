import { verifyJwt } from "../utils/auth";
import { RevenueService } from "../services/revenue.service";

const service = new RevenueService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const qs = event.queryStringParameters || {};
        const result = await service.getRevenueReport({
            range: qs.range,
            fromDate: qs.fromDate,
            toDate: qs.toDate,
        });

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (err) {
        console.error("Revenue API error", err);
        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};