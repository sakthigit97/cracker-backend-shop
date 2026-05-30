import { GetPackagesRepository } from "../repo/getPackages.repo";

export class GetPackagesService {
    constructor(
        private repo = new GetPackagesRepository()
    ) { }

    async getPackages() {
        return this.repo.getPackages();
    }
}