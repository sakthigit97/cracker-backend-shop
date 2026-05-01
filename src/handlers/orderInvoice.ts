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

    page.drawText("Premium quality crackers from Sivakasi", {
      x: left,
      y: 800,
      size: 10,
      font,
    });

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

    order.items.forEach((item: any) => {
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

      if (item.originalPrice && item.originalPrice > item.price) {
        page.drawText(`₹${item.originalPrice}`, {
          x: 420,
          y,
          size: 9,
          font,
          color: rgb(0.6, 0.6, 0.6),
        });

        const textWidth = font.widthOfTextAtSize(`₹${item.originalPrice}`, 9);
        page.drawLine({
          start: { x: 420, y: y + 4 },
          end: { x: 420 + textWidth, y: y + 4 },
          thickness: 1,
          color: rgb(0.6, 0.6, 0.6),
        });

        page.drawText(`₹${item.price}`, {
          x: 420,
          y: y - 12,
          size: 10,
          font,
        });

        if (item.discountText) {
          page.drawText(`${item.discountText}`, {
            x: 470,
            y: y - 12,
            size: 8,
            font,
            color: rgb(0, 0.5, 0),
          });
        }
      } else {
        page.drawText(`₹${item.price}`, {
          x: 420,
          y,
          size: 10,
          font,
        });
      }

      page.drawText(`₹${item.total}`, {
        x: 510,
        y,
        size: 10,
        font,
      });
      y -= item.originalPrice && item.originalPrice > item.price ? 36 : 22;
    });

    y -= 10;

    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    y -= 25;

    const subtotal = Number(order.subtotal || 0);
    const packaging = Number(order.packagingCharge || 0);
    const gst = Number(order.gstAmount || 0);
    const totalAmount = Number(order.totalAmount || 0);
    const walletUsed = Number(order.walletUsed || 0);
    const finalPayable = Number(order.finalPayable || totalAmount);

    const labelX = 380;
    const valueX = 540;

    function drawValue(text: string, yPos: number, size = 11) {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: valueX - textWidth,
        y: yPos,
        size,
        font,
      });
    }

    page.drawText("Subtotal", { x: labelX, y, size: 11, font });
    drawValue(`₹${subtotal}`, y);

    y -= 18;
    page.drawText("Packaging Charges", { x: labelX, y, size: 11, font });
    drawValue(`₹${packaging}`, y);

    if (gst > 0) {
      y -= 18;
      page.drawText("GST (18%)", { x: labelX, y, size: 11, font });
      drawValue(`₹${gst}`, y);
    }

    y -= 18;
    page.drawLine({
      start: { x: labelX, y },
      end: { x: valueX, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    y -= 18;

    page.drawText("Total Amount", { x: labelX, y, size: 12, font });
    drawValue(`₹${totalAmount}`, y, 12);

    y -= 18;

    if (walletUsed > 0) {
      page.drawText("Wallet Used", { x: labelX, y, size: 11, font });
      drawValue(`- ₹${walletUsed}`, y);
      y -= 18;
    }

    page.drawText("Final Payable", { x: labelX, y, size: 14, font });
    drawValue(`₹${finalPayable}`, y, 14);

    y -= 40;
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