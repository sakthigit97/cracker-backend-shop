import { processFlashSales } from "../services/flashSale.scheduler.service";

export const handler = async () => {
    try {
        const result = await processFlashSales();

        console.log(
            "Flash sale scheduler completed:",
            result,
        );

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error(
            "Flash sale scheduler failed:",
            error,
        );

        throw error;
    }
};