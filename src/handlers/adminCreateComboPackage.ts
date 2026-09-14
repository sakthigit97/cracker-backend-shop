import { verifyJwt } from "../utils/auth";
import { AdminCreateComboPackageService } from "../services/adminCreateComboPackage.service";

const service = new AdminCreateComboPackageService();
export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                body: "Request body required",
            };
        }

        const body = JSON.parse(event.body);

        const {
            name,
            price,
            productIds,
        } = body;

        if (
            !name ||
            typeof name !== "string" ||
            !name.trim()
        ) {
            return {
                statusCode: 400,
                body: "Combo name is required",
            };
        }

        if (
            price === undefined ||
            price === null ||
            Number(price) <= 0
        ) {
            return {
                statusCode: 400,
                body: "Combo price must be greater than 0",
            };
        }

        if (
            !Array.isArray(productIds) ||
            productIds.length === 0
        ) {
            return {
                statusCode: 400,
                body: "At least one product is required",
            };
        }

        const result =
            await service.createComboPackage({
                name: name.trim(),
                price: Number(price),
                productIds,
            });

        return {
            statusCode: 201,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(result),
        };
    } catch (err: any) {
        console.error(
            "AdminCreateComboPackage error",
            err
        );

        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    err?.message ||
                    "Internal Server Error",
            }),
        };
    }
};