import { listActiveFlashSales } from "../services/flashSale.service";

export const handler = async () => {
    try {
        const items = await listActiveFlashSales();

        return {
            statusCode: 200,
            body: JSON.stringify({
                items,
            }),
        };
    } catch (error: any) {
        console.error(
            "Get active flash sales failed",
            error
        );

        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    error?.message ||
                    "Unable to fetch flash sales",
            }),
        };
    }
};