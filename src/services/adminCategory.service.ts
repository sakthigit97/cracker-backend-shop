import { AdminCategoryRepository } from "../repo/adminCategory.repo";

interface ListCategoryInput {
    limit: number;
    cursor?: string;
    search?: string;
    isActive?: "true" | "false";
}

export class AdminCategoryService {
    constructor(
        private repo = new AdminCategoryRepository()
    ) { }

    async listCategories(input: ListCategoryInput) {
        return this.repo.listCategories(input);
    }

    async createCategory(input: {
        name: string;
        imageUrl?: string;
        sortOrder?: number;
        isActive: boolean;
    }) {
        return this.repo.createCategory(input);
    }

    async updateCategoryStatus(categoryId: string, isActive: boolean) {
        return this.repo.updateCategoryStatus(categoryId, isActive);
    }

    async getCategoryById(categoryId: string) {
        return this.repo.getCategoryById(categoryId);
    }

    async updateCategory(categoryId: string, payload: any) {
        return this.repo.updateCategory(categoryId, payload);
    }

    async deleteCategory(categoryId: string) {
        return this.repo.deleteCategory(categoryId);
    }
}
