export type CouponType = "FLAT" | "PERCENTAGE";
export interface Coupon {
    couponCode: string;
    description?: string;
    type: CouponType;
    value: number;
    expiryDate: string;
    createdAt: string;
    updatedAt: string;
}