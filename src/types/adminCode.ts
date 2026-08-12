export type AdminCodeStatus =
    | "ACTIVE"
    | "USED"
    | "EXPIRED";

export interface AdminCode {
    code: string;
    userId?: string;
    schemeId: string;
    expiryDate: number;
    status: AdminCodeStatus;
    createdAt: number;
    createdBy?: string;
    usedBy?: string;
    usedAt?: number;
}

export interface CreateAdminCodeRequest {
    userId: string;
    schemeId: string;
    code: string;
    expiryDate: number;
}