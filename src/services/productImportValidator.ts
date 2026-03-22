import { PRODUCT_IMPORT_SCHEMA_V1 as SCHEMA } from "../asset/productImportSchema";
import { BatchGetItemCommand } from "@aws-sdk/client-dynamodb";
import { ddb } from "../utils/aws";

type ImportFieldType = "string" | "number" | "boolean";

interface ImportFieldRule {
    required: boolean;
    type: ImportFieldType;
    default?: any;
    min?: number;
    minLength?: number;
}

export async function validateImportRows(
    rows: any[],
    brandTable: string,
    categoryTable: string
) {
    const errors: any[] = [];
    const tempValidRows: any[] = [];
    const brandIds = new Set<string>();
    const categoryIds = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
        const rowNumber = i + 2;
        const raw = rows[i];
        const normalized: any = {};
        let hasError = false;

        for (const [field, rules] of Object.entries(
            SCHEMA as Record<string, ImportFieldRule>
        )) {
            let value = raw[field];

            if (
                rules.required &&
                (value === undefined || value === null || value === "")
            ) {
                errors.push({
                    row: rowNumber,
                    field,
                    message: "Field is required",
                });
                hasError = true;
                break;
            }

            if (
                (value === undefined || value === null || value === "") &&
                rules.default !== undefined
            ) {
                value = rules.default;
            }

            if (value !== undefined && value !== null && value !== "") {
                const err = validateType(value, rules);
                if (err) {
                    errors.push({ row: rowNumber, field, message: err });
                    hasError = true;
                    break;
                }
            }

            normalized[field] = normalizeValue(value, rules.type);
        }

        if (!hasError) {
            brandIds.add(normalized.brandId);
            categoryIds.add(normalized.categoryId);
            tempValidRows.push({ row: rowNumber, ...normalized });
        }
    }

    const [validBrandIds, validCategoryIds] = await Promise.all([
        batchExists(brandTable, "brandId", [...brandIds]),
        batchExists(categoryTable, "categoryId", [...categoryIds]),
    ]);

    const finalValidRows: any[] = [];

    for (const row of tempValidRows) {
        let hasError = false;

        if (!validBrandIds.has(row.brandId)) {
            errors.push({
                row: row.row,
                field: "brandId",
                message: "Brand does not exist",
            });
            hasError = true;
        }

        if (!validCategoryIds.has(row.categoryId)) {
            errors.push({
                row: row.row,
                field: "categoryId",
                message: "Category does not exist",
            });
            hasError = true;
        }

        if (!hasError) finalValidRows.push(row);
    }

    return {
        validRows: finalValidRows,
        errors,
    };
}

async function batchExists(
    table: string,
    pkName: string,
    ids: string[]
): Promise<Set<string>> {
    if (ids.length === 0) return new Set();

    const found = new Set<string>();

    for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);

        const res = await ddb.send(
            new BatchGetItemCommand({
                RequestItems: {
                    [table]: {
                        Keys: batch.map((id) => ({ [pkName]: { S: id } })),
                        ProjectionExpression: pkName,
                    },
                },
            })
        );

        (res.Responses?.[table] || []).forEach((i: any) =>
            found.add(i[pkName].S)
        );
    }

    return found;
}

function validateType(value: any, rules: ImportFieldRule): string | null {
    if (rules.type === "number" && isNaN(Number(value)))
        return "Must be a number";

    if (
        rules.type === "boolean" &&
        !["true", "false", true, false].includes(value)
    )
        return "Must be true or false";

    if (rules.min !== undefined && Number(value) < rules.min)
        return `Must be >= ${rules.min}`;

    if (
        rules.minLength !== undefined &&
        String(value).trim().length < rules.minLength
    )
        return `Must have at least ${rules.minLength} characters`;

    return null;
}

function normalizeValue(value: any, type: ImportFieldType) {
    if (type === "number") return Number(value);
    if (type === "boolean") return value === true || value === "true";
    return String(value).trim();
}