import { verifyJwt } from "../utils/auth";
import { ProductReportService } from "../services/productReport.service";

const service = new ProductReportService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        const qs = event.queryStringParameters || {};

        const result = await service.getProductReport({
            range: qs.range,
            fromDate: qs.fromDate,
            toDate: qs.toDate,
        });

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (err) {
        console.error("Product report error", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};