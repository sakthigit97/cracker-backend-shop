export type ChitDiscountType = "flat" | "percentage";

export interface ChitInstallment {
    dueDate: string;
    amount: number;
    paidAmount: number;
    status: "pending" | "partial" | "paid";
    paymentHistory: {
        amount: number;
        receivedAt: string;
        receivedBy: string;
        note?: string;
    }[];
}

export interface ChitScheme {
    chitId: string;
    recordId: "SCHEME";
    entityType: "SCHEME";
    name: string;
    description?: string;
    packageAmount: number;
    discountType: ChitDiscountType;
    discountValue: number;
    payableAmount: number;
    monthlyAmount: number;
    joinDeadline: string;
    startDate: string;
    endDate: string;
    reminderDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChitMember {
    chitId: string;
    recordId: string;
    entityType: "MEMBER";
    schemeId: string;
    userId: string;
    name: string;
    phone: string;
    email?: string;
    joinedAt: string;
    payableAmount: number;
    totalPaid: number;
    installments: ChitInstallment[];
    reminderSentAt?: string;
    version: number;
    updatedAt: string;
}

export class ChitError extends Error {
    constructor(
        message: string,
        public statusCode: number
    ) {
        super(message);
        this.name = "ChitError";
    }
}
