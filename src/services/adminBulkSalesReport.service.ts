import {
    AdminBulkSalesReportRepository,
    BulkSalesReportFilters,
} from "../repo/adminBulkSalesReport.repo";

export class AdminBulkSalesReportService {
    constructor(
        private repo =
            new AdminBulkSalesReportRepository()
    ) { }

    async getSalesReport(
        filters: BulkSalesReportFilters
    ) {
        const {
            fromDate,
            toDate,
        } = filters;

        if (
            fromDate === undefined ||
            toDate === undefined
        ) {
            throw new Error(
                "fromDate and toDate are required"
            );
        }

        if (
            !Number.isFinite(fromDate) ||
            !Number.isFinite(toDate)
        ) {
            throw new Error(
                "Invalid date range"
            );
        }

        if (
            fromDate > toDate
        ) {
            throw new Error(
                "fromDate cannot be greater than toDate"
            );
        }

        return this.repo.getSalesReport({
            fromDate,
            toDate,
        });
    }
}