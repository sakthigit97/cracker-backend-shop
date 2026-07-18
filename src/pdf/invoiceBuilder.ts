import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import { PDF_THEME } from "./invoiceTheme";
import { money, line, text, formatStatus } from "./invoiceHelpers";


let cachedLogo: string | null = null;

function getLogoBase64() {
    if (cachedLogo) {
        return cachedLogo;
    }

    const logoPath = path.join(process.cwd(), "assets", "icon-new.png");

    const image = fs.readFileSync(logoPath);

    cachedLogo = `data:image/png;base64,${image.toString("base64")}`;

    return cachedLogo;
}

export async function buildInvoicePdf(
    order: any,
    config: any
) {

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
    });

    const normal = () => doc.setFont("helvetica", "normal");
    const bold = () => doc.setFont("helvetica", "bold");
    normal();
    doc.setFontSize(8);

    const LEFT = PDF_THEME.LEFT;
    const RIGHT = PDF_THEME.RIGHT;
    const COLORS = PDF_THEME.colors;
    let y = 10;

    const logo = getLogoBase64();

    doc.addImage(
        logo,
        "PNG",
        LEFT,
        y - 1,
        14,
        14
    );

    bold();
    doc.setFontSize(18);
    doc.setTextColor(0);

    text(
        doc,
        config?.companyName ||
        "SIVAKASI PYRO PARK",
        LEFT + 17,
        y + 4
    );

    normal();
    doc.setFontSize(8);
    doc.setTextColor(
        ...COLORS.gray
    );

    text(
        doc,
        "Premium Fireworks & Crackers",
        LEFT + 17,
        y + 9
    );

    const boxX = 138;
    const boxY = 8;
    const boxW = 60;
    const boxH = 16;

    doc.setFillColor(
        ...COLORS.warningBg
    );

    doc.setDrawColor(
        ...COLORS.warning
    );

    doc.roundedRect(
        boxX,
        boxY,
        boxW,
        boxH,
        2,
        2,
        "FD"
    );

    bold();

    doc.setFontSize(8.5);
    doc.setTextColor(
        146,
        64,
        14
    );

    text(
        doc,
        "IMPORTANT",
        boxX + 2.5,
        boxY + 4
    );

    normal();

    doc.setFontSize(7);
    doc.setTextColor(
        ...COLORS.dark
    );

    text(
        doc,
        "No Home Delivery",
        boxX + 2.5,
        boxY + 8
    );

    text(
        doc,
        "Transportation fee should be paid by customer",
        boxX + 2.5,
        boxY + 11.5
    );

    text(
        doc,
        "MIN: TN - 3000 | Other - 5000 | North - 10,000",
        boxX + 2.5,
        boxY + 15
    );

    y = 26;
    doc.setFontSize(7.5);
    doc.setTextColor(
        ...COLORS.dark
    );

    if (config?.displayMobile) {
        text(doc, config.displayMobile, LEFT, y);
        y += 4;
    }

    if (config?.adminEmail) {
        text(doc, config.adminEmail, LEFT, y);
        y += 4;
    }

    if (config?.adminAddress) {
        const address = doc.splitTextToSize(config.adminAddress, 175);
        text(doc, address, LEFT, y);
        y += address.length * 3.4;
    }

    y += 2;
    line(
        doc,
        y
    );

    y += 5;
    bold();
    doc.setFontSize(8);
    doc.setTextColor(0);
    text(
        doc,
        `Invoice No : ${order.orderId}`,
        LEFT,
        y
    );

    const orderDate = new Date(Number(order.updatedAt)).toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    );

    text(
        doc,
        `Order Date : ${orderDate}`,
        110,
        y
    );

    y += 4;


    text(
        doc,
        `Status : ${formatStatus(order.status)}`,
        LEFT,
        y
    );

    y += 6;
    line(
        doc,
        y
    );

    line(doc, y);
    y += 5;
    bold();
    doc.setFontSize(8);
    doc.setTextColor(0);

    text(
        doc,
        "CUSTOMER DETAILS",
        LEFT,
        y
    );

    y += 5;
    const customerLines = doc.splitTextToSize(
        (order.address ?? "").trim(),
        150
    );

    text(doc, customerLines, LEFT, y);
    y += customerLines.length * 3.8;

    y += 2;

    line(doc, y);
    y += 4;
    const tableStartY = y;
    autoTable(doc, {
        startY: tableStartY,
        theme: "grid",
        tableLineWidth: 0,
        head: [[
            "Product",
            "Qty",
            "MRP",
            "Offer",
            "Total"
        ]],

        body: order.items.map((item: any) => [

            item.isComboPackage
                ? `${item.name}  • Combo`
                : item.name,

            String(item.quantity),

            item.originalPrice
                ? money(item.originalPrice)
                : "-",

            money(item.price),

            money(item.total)
        ]),
        styles: {

            font: "helvetica",

            fontStyle: "normal",

            fontSize: 8,

            overflow: "linebreak",

            cellPadding: {
                top: 1.2,
                bottom: 1.2,
                left: 2.2,
                right: 2.2
            },

            minCellHeight: 6,

            lineWidth: 0.08,

            lineColor: COLORS.border,

            valign: "middle",

            textColor: COLORS.dark

        },
        alternateRowStyles: {
            fillColor: COLORS.alternate,
        },
        headStyles: {

            font: "helvetica",

            fontStyle: "bold",

            fontSize: 8,

            fillColor: COLORS.primary,

            textColor: [255, 255, 255],

            halign: "center",

            valign: "middle",

            cellPadding: {
                top: 2,
                bottom: 2,
                left: 2,
                right: 2
            }

        },
        columnStyles: {

            0: {
                cellWidth: 88,
                halign: "left"
            },

            1: {
                cellWidth: 14,
                halign: "center"
            },

            2: {
                cellWidth: 26,
                halign: "right"
            },

            3: {
                cellWidth: 28,
                halign: "right"
            },

            4: {
                cellWidth: 30,
                halign: "right"
            }

        },
        didParseCell: (data) => {

            if (data.section === "head") {

                data.cell.styles.lineColor =
                    COLORS.primary;

                return;

            }

            if (
                data.section === "body" &&
                data.column.index === 0
            ) {

                const item =
                    order.items[data.row.index];

                if (item?.isComboPackage) {

                    data.cell.styles.fontStyle = "bold";

                    data.cell.styles.textColor = [
                        25,
                        70,
                        140
                    ];

                }

            }

            if (
                data.section === "body" &&
                data.column.index === 2
            ) {

                data.cell.styles.textColor = [
                    120,
                    120,
                    120
                ];

                data.cell.styles.fillColor = [
                    248,
                    248,
                    248
                ];

            }

            if (
                data.section === "body" &&
                data.column.index === 3
            ) {

                data.cell.styles.fontStyle = "bold";

                data.cell.styles.textColor =
                    COLORS.primary;

            }

            if (
                data.section === "body" &&
                data.column.index === 4
            ) {

                data.cell.styles.fontStyle = "bold";

                data.cell.styles.textColor =
                    COLORS.primary;

            }

        }
    });
    let summaryStartY = (doc as any).lastAutoTable.finalY + 2;
    const SUMMARY_WIDTH = 80;
    const SUMMARY_X = RIGHT - SUMMARY_WIDTH;
    bold();
    doc.setFontSize(9);

    summaryStartY += 10;
    text(
        doc,
        "Invoice Summary",
        SUMMARY_X,
        summaryStartY
    );

    summaryStartY += 5;
    const drawSummaryRow = (
        label: string,
        value: number | string,
        bold = false
    ) => {

        doc.setFont(
            "helvetica",
            bold ? "bold" : "normal"
        );

        text(
            doc,
            label,
            SUMMARY_X,
            summaryStartY
        );
        const displayValue =
            typeof value === "number"
                ? money(value)
                : String(value ?? "");

        text(
            doc,
            displayValue,
            RIGHT,
            summaryStartY,
            {
                align: "right",
            }
        );

        summaryStartY += 5;
    };
    drawSummaryRow(
        "Subtotal",
        order.subtotal || 0
    );

    if (order.comboAmount > 0) {
        drawSummaryRow(
            "Combo Package",
            order.comboAmount
        );
    }

    if (order.eligibleChargeAmount > 0) {
        drawSummaryRow(
            "GST Eligible Amount",
            order.eligibleChargeAmount
        );
    }

    if (order.packagingCharge > 0) {
        drawSummaryRow(
            "Packaging Charge",
            order.packagingCharge
        );
    }

    if (order.gstAmount > 0) {
        drawSummaryRow(
            "GST",
            order.gstAmount
        );
    }

    if (order.walletUsed > 0) {
        drawSummaryRow(
            "Wallet Used",
            -order.walletUsed
        );
    }
    doc.setDrawColor(...COLORS.border);
    doc.line(
        SUMMARY_X,
        summaryStartY,
        RIGHT,
        summaryStartY
    );

    summaryStartY += 4;
    bold();
    doc.setFontSize(10);

    text(
        doc,
        "Final Payable",
        SUMMARY_X,
        summaryStartY
    );

    text(
        doc,
        money(order.finalPayable),
        RIGHT,
        summaryStartY,
        {
            align: "right",
        }
    );

    summaryStartY += 8;
    normal();
    doc.setFontSize(8);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);

    text(
        doc,
        "This is a computer generated invoice. No signature is required.",
        LEFT,
        summaryStartY
    );

    summaryStartY += 4;

    text(
        doc,
        "Thank you for shopping with Sivakasi Pyro Park.",
        LEFT,
        summaryStartY
    );

    summaryStartY += 6;
    return doc;
}