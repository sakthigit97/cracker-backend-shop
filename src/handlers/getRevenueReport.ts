import { verifyJwt } from "../utils/auth";
import { RevenueService } from "../services/revenue.service";

const service = new RevenueService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const qs = event.queryStringParameters || {};

        const {
            range,
            fromDate,
            toDate,
        } = qs;

        /*
         * Custom date filter requires both dates.
         */
        if (
            (fromDate && !toDate) ||
            (!fromDate && toDate)
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Both fromDate and toDate are required",
                }),
            };
        }

        const result =
            await service.getRevenueReport({
                range,
                fromDate,
                toDate,
            });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(result),
        };
    } catch (err: any) {
        console.error(
            "Revenue API error",
            err
        );

        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    err?.message ||
                    "Internal Server Error",
            }),
        };
    }
};