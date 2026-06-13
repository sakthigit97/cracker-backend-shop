export interface RecommendationIntent {
    budget: number | null;
    tags: string[];
    missingFields: string[];
}

export interface RecommendedProduct {
    productId: string;
    name: string;
    image: string | null;
    price: number;
    originalPrice?: number;
    discountText?: string;
    categoryId: string;
    brandId: string;
    qty: number;
}

export interface PackageResult {
    total: number;
    itemCount: number;
    items: RecommendedProduct[];
}

export interface RecommendationResponse {
    status:
    | "SUCCESS"
    | "NEEDS_BUDGET"
    | "INVALID_BUDGET"
    | "NO_PRODUCTS_FOUND";

    message?: string;

    extractedIntent?: RecommendationIntent;

    recommendedPackage?: PackageResult;

    additionalProducts?: RecommendedProduct[];
}