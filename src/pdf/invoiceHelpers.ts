import jsPDF from "jspdf";

export function money(value: number) {
    return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

export function line(doc: jsPDF, y: number) {
    doc.line(12, y, 198, y);
}

export function text(
    doc: jsPDF,
    value: string | string[],
    x: number,
    y: number,
    options?: any
) {
    doc.text(value as any, x, y, options);
}

export function formatStatus(status?: string) {
    if (!status) return "";

    return status
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}