import {
    AdminBulkAccountCreditReportRepository,
    BulkAccountCreditReportFilters,
} from "../repo/adminBulkAccountCreditReport.repo";

export class AdminBulkAccountCreditReportService {
    constructor(
        private repo =
            new AdminBulkAccountCreditReportRepository()
    ) { }

    async getAccountCreditReport(
        filters: BulkAccountCreditReportFilters
    ) {
        const {
            fromDate,
            toDate,
            paymentAccountId,
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

        return this.repo.getAccountCreditReport({
            fromDate,
            toDate,
            paymentAccountId:
                paymentAccountId?.trim() ||
                undefined,
        });
    }
}