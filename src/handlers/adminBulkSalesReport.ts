import { verifyJwt } from "../utils/auth";
import { AdminBulkSalesReportService } from "../services/adminBulkSalesReport.service";

const service =
    new AdminBulkSalesReportService();

export const handler = async (
    event: any
) => {
    try {
        const { role } =
            verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const params =
            event.queryStringParameters ||
            {};

        const {
            fromDate,
            toDate,
        } = params;

        if (
            !fromDate ||
            !toDate
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "fromDate and toDate are required",
                }),
            };
        }

        const fromTimestamp =
            new Date(
                `${fromDate}T00:00:00`
            ).getTime();

        const toTimestamp =
            new Date(
                `${toDate}T23:59:59.999`
            ).getTime();

        if (
            !Number.isFinite(
                fromTimestamp
            ) ||
            !Number.isFinite(
                toTimestamp
            )
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Invalid date range",
                }),
            };
        }

        const result =
            await service.getSalesReport({
                fromDate:
                    fromTimestamp,
                toDate:
                    toTimestamp,
            });

        return {
            statusCode: 200,
            headers: {
                "Content-Type":
                    "application/json",
            },
            body: JSON.stringify(
                result
            ),
        };
    } catch (err: any) {
        console.error(
            "AdminBulkSalesReport error",
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