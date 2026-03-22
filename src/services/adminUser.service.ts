import { AdminUserRepository } from "../repo/adminUser.repo";

export class AdminUserService {
    constructor(private repo = new AdminUserRepository()) { }

    async listUsers(input: {
        search?: string;
        isActive?: "true" | "false";
        cursor?: string;
        limit: number;
    }) {
        return this.repo.listUsers(input);
    }

    async deleteUser(userId: string) {
        return this.repo.deleteUser(userId);
    }
}
