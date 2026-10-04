import type {
    APIGatewayProxyHandlerV2,
} from "aws-lambda";

import { verifyJwt } from "../utils/auth";

import {
    success,
    error as errorResponse,
} from "../libs/response";

import {
    cancelFlashSale,
    createFlashSale,
    getFlashSale,
    listFlashSales,
    updateFlashSale,
} from "../services/flashSale.service";


function getErrorMessage(
    error: unknown,
): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Internal Server Error";
}

function isNotFoundError(
    message: string,
): boolean {
    return (
        message ===
        "Flash sale not found"
    );
}

function isConflictError(
    message: string,
): boolean {
    return (
        message.startsWith(
            "Product already has a flash sale",
        ) ||
        message.includes(
            "could not be activated",
        ) ||
        message.includes(
            "could not be cancelled",
        )
    );
}

function isValidationError(
    message: string,
): boolean {
    const validationMessages = [
        "Product ID is required",
        "Flash sale header is required",
        "Flash sale image is required",
        "Sale price must be greater than zero",
        "Invalid start date",
        "Invalid end date",
        "Start date must be before end date",
        "Flash sale end date must be in the future",
        "Product not found",
        "Product has an invalid price",
        "Flash sale price must be lower than the original price",
        "Expired or cancelled flash sales cannot be updated",
        "Flash sale ID is required",
    ];

    if (
        validationMessages.includes(message)
    ) {
        return true;
    }

    return (
        message.startsWith(
            "Invalid start",
        ) ||
        message.startsWith(
            "Invalid end",
        )
    );
}

function requireAdmin(event: Parameters<APIGatewayProxyHandlerV2>[0]): void {
    const { userId, role } =
        verifyJwt(event);

    if (!userId) {
        throw new Error("Unauthorized");
    }

    if (role !== "admin") {
        throw new Error(
            "Admin access required",
        );
    }
}

export const createHandler: APIGatewayProxyHandlerV2 =
    async (event) => {
        try {
            requireAdmin(event);

            if (!event.body) {
                return errorResponse(
                    "Request body is required",
                    400,
                );
            }

            let body: Record<
                string,
                unknown
            >;

            try {
                body = JSON.parse(
                    event.body,
                );
            } catch {
                return errorResponse(
                    "Invalid JSON request body",
                    400,
                );
            }

            const productId =
                typeof body.productId ===
                    "string"
                    ? body.productId.trim()
                    : "";

            const header =
                typeof body.header ===
                    "string"
                    ? body.header.trim()
                    : "";

            const imageUrl =
                typeof body.imageUrl ===
                    "string"
                    ? body.imageUrl.trim()
                    : "";

            const salePrice =
                Number(body.salePrice);

            const startAt =
                typeof body.startAt ===
                    "string"
                    ? body.startAt
                    : "";

            const endAt =
                typeof body.endAt ===
                    "string"
                    ? body.endAt
                    : "";

            const flashSale =
                await createFlashSale({
                    productId,
                    header,
                    imageUrl,
                    salePrice,
                    startAt,
                    endAt,
                });

            return success({
                data: flashSale,
            });
        } catch (error) {
            console.error(
                "Create flash sale error:",
                error,
            );

            const message =
                getErrorMessage(error);

            if (
                message ===
                "Unauthorized"
            ) {
                return errorResponse(
                    "Unauthorized",
                    401,
                );
            }

            if (
                message ===
                "Admin access required"
            ) {
                return errorResponse(
                    "Admin access required",
                    403,
                );
            }

            if (
                isConflictError(message)
            ) {
                return errorResponse(
                    message,
                    409,
                );
            }

            if (
                isValidationError(message)
            ) {
                return errorResponse(
                    message,
                    400,
                );
            }

            return errorResponse(
                "Failed to create flash sale",
                500,
            );
        }
    };

export const listHandler: APIGatewayProxyHandlerV2 =
    async (event) => {
        try {
            requireAdmin(event);

            const flashSales =
                await listFlashSales();

            return success({
                data: flashSales,
            });
        } catch (error) {
            console.error(
                "List flash sales error:",
                error,
            );

            const message =
                getErrorMessage(error);

            if (
                message ===
                "Unauthorized"
            ) {
                return errorResponse(
                    "Unauthorized",
                    401,
                );
            }

            if (
                message ===
                "Admin access required"
            ) {
                return errorResponse(
                    "Admin access required",
                    403,
                );
            }

            return errorResponse(
                "Failed to retrieve flash sales",
                500,
            );
        }
    };


export const getHandler: APIGatewayProxyHandlerV2 =
    async (event) => {
        try {
            requireAdmin(event);

            const flashSaleId =
                event.pathParameters
                    ?.flashSaleId?.trim();

            if (!flashSaleId) {
                return errorResponse(
                    "Flash sale ID is required",
                    400,
                );
            }

            const flashSale =
                await getFlashSale(
                    flashSaleId,
                );

            if (!flashSale) {
                return errorResponse(
                    "Flash sale not found",
                    404,
                );
            }

            return success({
                data: flashSale,
            });
        } catch (error) {
            console.error(
                "Get flash sale error:",
                error,
            );

            const message =
                getErrorMessage(error);

            if (
                message ===
                "Unauthorized"
            ) {
                return errorResponse(
                    "Unauthorized",
                    401,
                );
            }

            if (
                message ===
                "Admin access required"
            ) {
                return errorResponse(
                    "Admin access required",
                    403,
                );
            }

            if (
                isNotFoundError(message)
            ) {
                return errorResponse(
                    message,
                    404,
                );
            }

            return errorResponse(
                "Failed to retrieve flash sale",
                500,
            );
        }
    };


export const updateHandler: APIGatewayProxyHandlerV2 =
    async (event) => {
        try {
            requireAdmin(event);

            const flashSaleId =
                event.pathParameters
                    ?.flashSaleId?.trim();

            if (!flashSaleId) {
                return errorResponse(
                    "Flash sale ID is required",
                    400,
                );
            }

            if (!event.body) {
                return errorResponse(
                    "Request body is required",
                    400,
                );
            }

            let body: Record<
                string,
                unknown
            >;

            try {
                body = JSON.parse(
                    event.body,
                );
            } catch {
                return errorResponse(
                    "Invalid JSON request body",
                    400,
                );
            }

            const input: {
                header?: string;
                imageUrl?: string;
                salePrice?: number;
                startAt?: string;
                endAt?: string;
            } = {};

            if (
                body.header !==
                undefined
            ) {
                if (
                    typeof body.header !==
                    "string"
                ) {
                    return errorResponse(
                        "Flash sale header must be a string",
                        400,
                    );
                }

                input.header =
                    body.header.trim();
            }

            if (
                body.imageUrl !==
                undefined
            ) {
                if (
                    typeof body.imageUrl !==
                    "string"
                ) {
                    return errorResponse(
                        "Flash sale image must be a string",
                        400,
                    );
                }

                input.imageUrl =
                    body.imageUrl.trim();
            }

            if (
                body.salePrice !==
                undefined
            ) {
                const salePrice =
                    Number(
                        body.salePrice,
                    );

                if (
                    !Number.isFinite(
                        salePrice,
                    )
                ) {
                    return errorResponse(
                        "Sale price must be a valid number",
                        400,
                    );
                }

                input.salePrice =
                    salePrice;
            }

            if (
                body.startAt !==
                undefined
            ) {
                if (
                    typeof body.startAt !==
                    "string"
                ) {
                    return errorResponse(
                        "Start date must be a valid date",
                        400,
                    );
                }

                input.startAt =
                    body.startAt;
            }

            if (
                body.endAt !==
                undefined
            ) {
                if (
                    typeof body.endAt !==
                    "string"
                ) {
                    return errorResponse(
                        "End date must be a valid date",
                        400,
                    );
                }

                input.endAt =
                    body.endAt;
            }

            const flashSale =
                await updateFlashSale(
                    flashSaleId,
                    input,
                );

            return success({
                data: flashSale,
            });
        } catch (error) {
            console.error(
                "Update flash sale error:",
                error,
            );

            const message =
                getErrorMessage(error);

            if (
                message ===
                "Unauthorized"
            ) {
                return errorResponse(
                    "Unauthorized",
                    401,
                );
            }

            if (
                message ===
                "Admin access required"
            ) {
                return errorResponse(
                    "Admin access required",
                    403,
                );
            }

            if (
                isNotFoundError(message)
            ) {
                return errorResponse(
                    message,
                    404,
                );
            }

            if (
                isConflictError(message)
            ) {
                return errorResponse(
                    message,
                    409,
                );
            }

            if (
                isValidationError(message)
            ) {
                return errorResponse(
                    message,
                    400,
                );
            }

            return errorResponse(
                "Failed to update flash sale",
                500,
            );
        }
    };

export const cancelHandler: APIGatewayProxyHandlerV2 =
    async (event) => {
        try {
            requireAdmin(event);

            const flashSaleId =
                event.pathParameters
                    ?.flashSaleId?.trim();

            if (!flashSaleId) {
                return errorResponse(
                    "Flash sale ID is required",
                    400,
                );
            }

            await cancelFlashSale(
                flashSaleId,
            );

            return success({
                message:
                    "Flash sale cancelled successfully",
            });
        } catch (error) {
            console.error(
                "Cancel flash sale error:",
                error,
            );

            const message =
                getErrorMessage(error);

            if (
                message ===
                "Unauthorized"
            ) {
                return errorResponse(
                    "Unauthorized",
                    401,
                );
            }

            if (
                message ===
                "Admin access required"
            ) {
                return errorResponse(
                    "Admin access required",
                    403,
                );
            }

            if (
                isNotFoundError(message)
            ) {
                return errorResponse(
                    message,
                    404,
                );
            }

            if (
                isConflictError(message)
            ) {
                return errorResponse(
                    message,
                    409,
                );
            }

            return errorResponse(
                "Failed to cancel flash sale",
                500,
            );
        }
    };