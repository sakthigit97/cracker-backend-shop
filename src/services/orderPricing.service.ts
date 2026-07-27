import { PricingInput, PricingItem, PricingResult } from "../models/orderPricing";

export class OrderPricingService {

    private calculateProductTotals(items: PricingItem[]) {

        let totalProductAmount = 0;
        let nonComboProductTotal = 0;
        let comboPackageTotal = 0;

        for (const item of items) {

            totalProductAmount += item.total;

            if (item.isComboPackage) {
                comboPackageTotal += item.total;
            } else {
                nonComboProductTotal += item.total;
            }
        }

        return {
            totalProductAmount,
            nonComboProductTotal,
            comboPackageTotal,
        };
    }

    private calculatePackaging(
        nonComboProductTotal: number,
        config: PricingInput["config"]
    ) {

        if (
            config.enablePackagingCharge === false ||
            config.packagingPercent <= 0
        ) {
            return 0;
        }

        return Math.round(
            (nonComboProductTotal * config.packagingPercent) / 100
        );
    }

    private calculateGST(
        discountedGrossTotal: number,
        state: string | undefined,
        config: PricingInput["config"]
    ) {

        if (config.enableGst === false) {
            return 0;
        }

        const isTamilNadu =
            state?.toLowerCase().includes("tamil nadu");

        if (
            isTamilNadu &&
            config.disableGstForTN
        ) {
            return 0;
        }

        const effectivePercent =
            config.gstPercent / 2;

        return Math.round(
            (discountedGrossTotal * effectivePercent) / 100
        );
    }

    private calculateFinalPayable(
        grandTotal: number,
        walletUsed: number
    ) {

        return Math.max(
            0,
            grandTotal - walletUsed
        );
    }

    public calculateAmountBeforeDiscount(
        items: PricingItem[],
        config: PricingInput["config"]
    ): number {

        const totals = this.calculateProductTotals(items);
        const packagingCharge = this.calculatePackaging(
            totals.nonComboProductTotal,
            config
        );
        return totals.totalProductAmount + packagingCharge;
    }

    calculate(input: PricingInput): PricingResult {

        const totals = this.calculateProductTotals(input.items);
        const packagingCharge = this.calculatePackaging(
            totals.nonComboProductTotal,
            input.config
        );

        const amountBeforeDiscount = totals.totalProductAmount + packagingCharge;
        const couponCode = input.couponResult?.couponCode ?? null;
        const couponType = input.couponResult?.couponType ?? null;
        const couponValue = input.couponResult?.couponValue ?? null;
        let couponDiscount = 0;
        if (couponCode && couponType && couponValue != null) {
            if (couponType === "PERCENTAGE") {
                couponDiscount = Math.round(
                    (amountBeforeDiscount * couponValue) / 100
                );
            } else {
                couponDiscount = couponValue;
            }
            couponDiscount = Math.min(couponDiscount, amountBeforeDiscount);
        }

        const amountAfterDiscount = amountBeforeDiscount - couponDiscount;
        const gstAmount = this.calculateGST(
            amountAfterDiscount,
            input.state,
            input.config
        );

        const grandTotal = amountAfterDiscount + gstAmount;
        const appliedWallet = Math.min(input.walletUsed, grandTotal);
        const finalPayable = this.calculateFinalPayable(grandTotal, appliedWallet);
        return {
            totalProductAmount: totals.totalProductAmount,
            nonComboProductTotal: totals.nonComboProductTotal,
            comboPackageTotal: totals.comboPackageTotal,
            packagingCharge,
            amountBeforeDiscount,
            couponCode,
            couponType,
            couponValue,
            couponDiscount,
            amountAfterDiscount,
            gstAmount,
            grandTotal,
            walletUsed: appliedWallet,
            finalPayable,
        };
    }
}