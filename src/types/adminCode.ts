export type AdminCodeScheme =
    | "2_TO_5_LAKH"
    | "ABOVE_5_LAKH";

export type AdminCodeStatus =
    | "ACTIVE"
    | "USED"
    | "EXPIRED";

export interface AdminCode {
    code: string;
    userId?: string;
    schemeId: AdminCodeScheme;
    expiryDate: number;
    status: AdminCodeStatus;
    createdAt: number;
    createdBy?: string;
    usedBy?: string;
    usedAt?: number;
}

export interface CreateAdminCodeRequest {
    userId: string;
    schemeId: AdminCodeScheme;
    code: string;
    expiryDate: number;
}