import { randomBytes } from "crypto";
import { Coupon } from "../models/coupon.model";
import { CouponRepository } from "../repo/coupon.repo";

export class CouponService {

    private repo = new CouponRepository();

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

        if (new Date(payload.expiryDate) <= new Date()) {
            throw new Error("Expiry Date must be a future date");
        }

        const couponCode = payload.couponCode?.trim().toUpperCase();

        if (!couponCode) {
            throw new Error("Coupon Code is required");
        }

        const now = new Date().toISOString();

        const coupon: Coupon = {

            couponCode,

            description: payload.description ?? "",

            type: payload.type,

            value: payload.value,
            expiryDate: payload.expiryDate,

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

        if (!couponCode) {
            throw new Error("Coupon Code is required");
        }

        const coupon = await this.repo.getCoupon(
            couponCode.trim().toUpperCase()
        );

        if (!coupon) {
            throw new Error("Invalid Coupon Code");
        }

        if (new Date(coupon.expiryDate) <= new Date()) {
            throw new Error("Coupon Expired");
        }

        let discount = 0;

        if (coupon.type === "FLAT") {
            discount = Math.min(coupon.value, orderAmount);
        } else {
            discount = (orderAmount * coupon.value) / 100;
        }

        discount = Math.round(discount);
        const payable = Math.max(0, orderAmount - discount);
        return {
            couponCode: coupon.couponCode,
            couponType: coupon.type,
            couponValue: coupon.value,
            couponDiscount: discount,
            payable,
        };
    }

}