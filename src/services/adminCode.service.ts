import { AdminCodeRepository } from "../repo/adminCode.repo";
import { AdminCode } from "../types/adminCode";

export class AdminCodeService {

    static async createCode(
        code: AdminCode
    ) {

        const existing =
            await AdminCodeRepository.getByCode(
                code.code
            );

        if (existing) {

            throw new Error(
                "Code already exists"
            );

        }

        await AdminCodeRepository.create(
            code
        );

        return code;

    }

    static async listCodes() {

        const codes =
            await AdminCodeRepository.list();

        return codes.sort(
            (a, b) =>
                b.createdAt -
                a.createdAt
        );

    }

    static async listCodesForUser(
        userId: string
    ) {

        const codes =
            await AdminCodeRepository.listByUserId(
                userId
            );

        return codes.sort(
            (a, b) =>
                b.createdAt -
                a.createdAt
        );
    }

    static async deleteCode(
        code: string
    ) {

        const existing =
            await AdminCodeRepository.getByCode(
                code
            );

        if (!existing) {

            throw new Error(
                "Code not found"
            );

        }

        await AdminCodeRepository.delete(
            code
        );

    }
    static async validateCode(
        userId: string,
        code: string,
        schemeId?: string
    ) {
        const adminCode =
            await AdminCodeRepository.getByCode(
                code
            );

        if (!adminCode) {
            throw new Error(
                "Invalid Admin Code"
            );
        }

        if (
            adminCode.status !==
            "ACTIVE"
        ) {
            throw new Error(
                "This Admin Code is no longer active."
            );
        }

        if (
            adminCode.expiryDate <=
            Date.now()
        ) {
            throw new Error(
                "Admin Code has expired"
            );
        }

        if (
            adminCode.userId !==
            userId
        ) {
            throw new Error(
                "This Admin Code is not assigned to you"
            );
        }

        if (
            schemeId &&
            adminCode.schemeId !==
            schemeId
        ) {
            throw new Error(
                "This Admin Code is not valid for the selected bulk scheme."
            );
        }

        return {
            schemeId:
                adminCode.schemeId,
            success: true,
        };
    }

}