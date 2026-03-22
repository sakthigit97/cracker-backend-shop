import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { verifyJwt } from "../utils/auth";
import { OrderRepository } from "../repo/order.repo";

const repo = new OrderRepository();
export const handler = async (event: any) => {
    try {
        verifyJwt(event);

        const orderId = event.pathParameters?.orderId;
        if (!orderId) {
            return { statusCode: 400, body: "orderId required" };
        }

        const order = await repo.getById(orderId);
        if (!order) {
            return { statusCode: 404, body: "Order not found" };
        }

        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        const fontPath = path.join(process.cwd(), "assets/NotoSans-Regular.ttf");
        const fontBytes = fs.readFileSync(fontPath);
        const font = await pdfDoc.embedFont(fontBytes);

        const page = pdfDoc.addPage([595, 842]);
        const { width } = page.getSize();

        const left = 50;
        const right = width - 50;
        let y = 820;
        page.drawRectangle({
            x: 0,
            y: 780,
            width,
            height: 60,
            color: rgb(0.95, 0.95, 0.95),
        });

        page.drawText("SIVAKASI CRACKERS", {
            x: left,
            y: 815,
            size: 18,
            font,
        });

        page.drawText(
            "Premium quality crackers from Sivakasi",
            {
                x: left,
                y: 800,
                size: 10,
                font,
            }
        );

        page.drawText("INVOICE", {
            x: width - 130,
            y: 815,
            size: 18,
            font,
        });

        y = 760;

        page.drawText(`Order ID: ${order.orderId}`, {
            x: left,
            y,
            size: 11,
            font,
        });

        y -= 15;

        page.drawText(
            `Order Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`,
            {
                x: left,
                y,
                size: 11,
                font,
            }
        );

        y -= 15;

        page.drawText(`Payment Mode: ${order.paymentMode}`, {
            x: left,
            y,
            size: 11,
            font,
        });

        y -= 25;

        page.drawLine({
            start: { x: left, y },
            end: { x: right, y },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });

        y -= 20;

        page.drawText("Shipping Address", {
            x: left,
            y,
            size: 12,
            font,
        });

        y -= 15;

        const addressLines = order.address.split("\n");

        addressLines.forEach((line: string) => {
            page.drawText(line.trim(), {
                x: left,
                y,
                size: 10,
                font,
            });
            y -= 14;
        });

        y -= 30;

        page.drawRectangle({
            x: left,
            y,
            width: width - 100,
            height: 25,
            color: rgb(0.9, 0.9, 0.9),
        });

        page.drawText("Product", { x: left + 5, y: y + 7, size: 10, font });
        page.drawText("Qty", { x: 370, y: y + 7, size: 10, font });
        page.drawText("Price (₹)", { x: 420, y: y + 7, size: 10, font });
        page.drawText("Total (₹)", { x: 510, y: y + 7, size: 10, font });

        y -= 30;

        let subtotal = 0;

        order.items.forEach((item: any) => {
            subtotal += item.price * item.quantity;

            page.drawText(item.name, {
                x: left + 5,
                y,
                size: 10,
                font,
            });

            page.drawText(String(item.quantity), {
                x: 380,
                y,
                size: 10,
                font,
            });

            page.drawText(`₹${item.price}`, {
                x: 420,
                y,
                size: 10,
                font,
            });

            page.drawText(`₹${item.total}`, {
                x: 510,
                y,
                size: 10,
                font,
            });

            y -= 18;
        });

        y -= 10;

        page.drawLine({
            start: { x: left, y },
            end: { x: right, y },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });

        y -= 25;
        const grandTotal = order.items.reduce(
            (sum: number, i: any) => sum + i.total,
            0
        );

        page.drawText("Subtotal:", {
            x: 420,
            y,
            size: 11,
            font,
        });

        page.drawText(`₹${subtotal}`, {
            x: 510,
            y,
            size: 11,
            font,
        });

        y -= 20;

        page.drawText("Grand Total:", {
            x: 420,
            y,
            size: 14,
            font,
        });

        page.drawText(`₹${grandTotal}`, {
            x: 510,
            y,
            size: 14,
            font,
        });

        y -= 40;
        page.drawText(
            "This is a system generated invoice and does not require signature.",
            {
                x: left,
                y,
                size: 9,
                font,
                color: rgb(0.5, 0.5, 0.5),
            }
        );

        const pdfBytes = await pdfDoc.save();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=invoice-${orderId}.pdf`,
            },
            body: Buffer.from(pdfBytes).toString("base64"),
            isBase64Encoded: true,
        };
    } catch (err) {
        console.error("Invoice error", err);
        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
};