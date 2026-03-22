export const PRODUCT_IMPORT_SCHEMA_V1 = {
    name: { required: true, type: "string", minLength: 3 },
    description: { required: false, type: "string" },
    price: { required: true, type: "number", min: 1 },
    quantity: {
        required: true,
        type: "number",
        min: 0,
        default: 0,
    },
    brandId: { required: true, type: "string" },
    categoryId: { required: true, type: "string" },
    videoUrl: { required: false, type: "string" },
    isActive: { required: false, type: "boolean", default: true }
} as const;
