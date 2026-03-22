import { verifyJwt } from "../utils/auth";
import { AdminCreateProductService } from "../services/adminCreateProduct.service";

const service = new AdminCreateProductService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);
        if (role !== "admin") {
            return { statusCode: 403, body: "Forbidden" };
        }

        if (!event.body) {
            return { statusCode: 400, body: "Request body required" };
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

        if (quantity === undefined || Number(quantity) < 0) {
            return {
                statusCode: 400,
                body: "quantity is required and cannot be negative",
            };
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