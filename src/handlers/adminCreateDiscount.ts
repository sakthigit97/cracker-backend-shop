import { verifyJwt } from "../utils/auth";
import { AdminDiscountService } from "../services/adminDiscount.service";
import { error } from "../libs/response";

const service = new AdminDiscountService();

export const handler = async (
    event: any
) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const body = JSON.parse(
            event.body || "{}"
        );

        const isApplyToAll =
            body.discountType === "PRODUCT" &&
            body.applyToAll === true;

        if (
            !isApplyToAll &&
            !body.targetId
        ) {
            return {
                statusCode: 400,
                body: "Missing required fields",
            };
        }

        if (!body.discountValue) {
            return {
                statusCode: 400,
                body: "Missing required fields",
            };
        }

        /*
         * Apply to all products.
         *
         * This is PRODUCT only.
         */
        if (isApplyToAll) {
            const created =
                await service.createDiscountForAllProducts(
                    body
                );

            return {
                statusCode: 200,
                body: JSON.stringify(created),
            };
        }

        /*
         * Existing individual target logic.
         * DO NOT CHANGE.
         */
        const exists =
            await service.existsByTargetId(
                body.targetId
            );

        if (exists) {
            return error(
                "A discount already exists for the selected target."
            );
        }

        const created =
            await service.createDiscount(
                body
            );

        return {
            statusCode: 200,
            body: JSON.stringify(created),
        };
    } catch (err) {
        console.error(
            "CreateDiscount error",
            err
        );

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};