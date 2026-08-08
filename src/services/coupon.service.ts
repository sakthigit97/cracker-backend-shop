import { Coupon } from "../models/coupon.model";
import { CouponRepository } from "../repo/coupon.repo";

export class CouponService {
    private repo = new CouponRepository();

    private normalizeExpiryDate(expiryDate: string): string {
        const value = expiryDate.trim();

        if (!value) {
            throw new Error("Expiry Date is required");
        }

        if (
            value.endsWith("Z") ||
            /[+-]\d{2}:\d{2}$/.test(value)
        ) {
            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                throw new Error("Invalid Expiry Date");
            }

            return date.toISOString();
        }

        const date = new Date(`${value}:00+05:30`);
        if (Number.isNaN(date.getTime())) {
            throw new Error("Invalid Expiry Date");
        }

        return date.toISOString();
    }

    async createCoupon(payload: Partial<Coupon>) {
        if (!payload.type) {
            throw new Error("Coupon type is required");
        }

        if (
            payload.value === undefined ||
            payload.value === null ||
            payload.value <= 0
        ) {
            throw new Error("Coupon value must be greater than zero");
        }

        if (
            payload.type === "PERCENTAGE" &&
            payload.value > 100
        ) {
            throw new Error("Percentage cannot exceed 100");
        }

        if (!payload.expiryDate) {
            throw new Error("Expiry Date is required");
        }

        const expiryDate = this.normalizeExpiryDate(
            payload.expiryDate
        );

        if (new Date(expiryDate).getTime() <= Date.now()) {
            throw new Error("Expiry Date must be a future date");
        }

        const couponCode =
            payload.couponCode?.trim().toUpperCase();

        if (!couponCode) {
            throw new Error("Coupon Code is required");
        }

        const now = new Date().toISOString();

        const coupon: Coupon = {
            couponCode,
            description: payload.description ?? "",
            type: payload.type,
            value: payload.value,
            expiryDate,
            createdAt: now,
            updatedAt: now,
        };

        return await this.repo.createCoupon(coupon);
    }

    async getCoupons() {
        const coupons = await this.repo.listCoupons();

        return coupons.sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    async deleteCoupon(couponCode: string) {
        if (!couponCode) {
            throw new Error("Coupon code is required");
        }

        await this.repo.deleteCoupon(couponCode);
    }

    async validateCoupon(
        couponCode: string,
        orderAmount: number
    ) {
        if (!couponCode?.trim()) {
            throw new Error("Coupon Code is required");
        }

        const coupon = await this.repo.getCoupon(
            couponCode.trim().toUpperCase()
        );

        if (!coupon) {
            throw new Error("Invalid Coupon Code");
        }

        const expiryTime = new Date(
            coupon.expiryDate
        ).getTime();

        if (Number.isNaN(expiryTime)) {
            console.error(
                "Invalid coupon expiryDate:",
                coupon.expiryDate
            );

            throw new Error("Invalid Coupon Expiry");
        }

        if (expiryTime <= Date.now()) {
            throw new Error("Coupon Expired");
        }

        let discount = 0;

        if (coupon.type === "FLAT") {
            discount = Math.min(
                coupon.value,
                orderAmount
            );
        } else {
            discount =
                (orderAmount * coupon.value) / 100;
        }

        discount = Math.round(discount);

        const payable = Math.max(
            0,
            orderAmount - discount
        );

        return {
            couponCode: coupon.couponCode,
            couponType: coupon.type,
            couponValue: coupon.value,
            couponDiscount: discount,
            payable,
        };
    }
}