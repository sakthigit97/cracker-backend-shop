import { AdminUserRepository } from "../repo/adminUser.repo";

export class AdminUserService {
    constructor(
        private repo = new AdminUserRepository()
    ) { }

    async listUsers(input: {
        search?: string;
        isBulkUser?: boolean;
        rolefilter?: string;
        isActive?: "true" | "false";
        cursor?: string;
        limit: number;
    }) {
        return this.repo.listUsers(input);
    }

    async listUserMobiles() {
        return this.repo.listUserMobiles();
    }

    async deleteUser(userId: string) {
        return this.repo.deleteUser(userId);
    }

    async updateUser(
        mobile: string,
        input: {
            name?: string;
            role?: string;
            address?: string;
            city?: string;
            state?: string;
            district?: string;
            pincode?: string;
            walletCredit?: number;
            chitBalance?: number;
            isBulkUser?: boolean;
        }
    ) {
        return this.repo.updateUser(
            mobile,
            input
        );
    }

    async setBulkUser(
        mobile: string,
        isBulkUser: boolean
    ) {
        return this.repo.setBulkUser(
            mobile,
            isBulkUser
        );
    }
    async getUserByMobile(mobile: string) {
        return this.repo.getUserByMobile(mobile);
    }
}