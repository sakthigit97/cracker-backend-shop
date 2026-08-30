import { verifyJwt } from "../utils/auth";
import { AdminCreateProductService } from "../services/adminCreateProduct.service";

const service = new AdminCreateProductService();

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
            productId,
            name,
            price,
            quantity,
            brandId,
            categoryId,
            imageUrls,
            videoUrl,
            searchText,
            description,
            isActive,
            packageTagIds,
            aiTags,
            isComboPackage,
            isRetailOnly,
            bulkOrderBasePrice,
            cartonQty,
            isBulkOrderOnly,
            packQuantity,
            packUnit,
            isGiftPack,
        } = body;


        if (
            !productId ||
            !name ||
            !price ||
            !brandId ||
            !categoryId ||
            !searchText ||
            !description
        ) {
            return {
                statusCode: 400,
                body:
                    "productId, name, price, brandId, categoryId, searchText, description are required",
            };
        }

        if (
            quantity === undefined ||
            Number(quantity) < 0
        ) {
            return {
                statusCode: 400,
                body: "quantity is required and cannot be negative",
            };
        }

        if (
            packQuantity === undefined ||
            packQuantity === null ||
            Number(packQuantity) <= 0
        ) {
            return {
                statusCode: 400,
                body: "packQuantity is required and must be greater than 0",
            };
        }

        if (
            !packUnit ||
            typeof packUnit !== "string" ||
            !packUnit.trim()
        ) {
            return {
                statusCode: 400,
                body: "packUnit is required",
            };
        }

        if (isBulkOrderOnly) {
            if (
                bulkOrderBasePrice === undefined ||
                bulkOrderBasePrice === null ||
                Number(bulkOrderBasePrice) <= 0
            ) {
                return {
                    statusCode: 400,
                    body:
                        "bulkOrderBasePrice is required and must be greater than 0 for bulk order products",
                };
            }

            if (
                cartonQty === undefined ||
                cartonQty === null ||
                Number(cartonQty) <= 0
            ) {
                return {
                    statusCode: 400,
                    body:
                        "cartonQty is required and must be greater than 0 for bulk order products",
                };
            }
        }

        const product = await service.createProduct({
            productId,
            name,
            price: Number(price),
            quantity: Number(quantity),
            brandId,
            categoryId,
            imageUrls: imageUrls || [],
            videoUrl,
            searchText,
            description,
            isActive,
            packageTagIds: packageTagIds || [],
            aiTags: aiTags || [],
            isComboPackage: Boolean(isComboPackage),
            isRetailOnly: Boolean(isRetailOnly),
            isBulkOrderOnly: Boolean(isBulkOrderOnly),
            bulkOrderBasePrice:
                bulkOrderBasePrice !== undefined &&
                    bulkOrderBasePrice !== null &&
                    bulkOrderBasePrice !== ""
                    ? Number(bulkOrderBasePrice)
                    : null,
            cartonQty:
                cartonQty !== undefined &&
                    cartonQty !== null &&
                    cartonQty !== ""
                    ? Number(cartonQty)
                    : null,
            packQuantity: Number(packQuantity),
            packUnit: packUnit.trim(),
            isGiftPack: Boolean(isGiftPack),
        });

        return {
            statusCode: 201,
            body: JSON.stringify(product),
        };
    } catch (err) {
        console.error("AdminCreateProduct error", err);

        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};