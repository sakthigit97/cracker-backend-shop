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
    const logoPath = path.join(process.cwd(), "assets", "icon-new.png");
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);

    const fontPath = path.join(process.cwd(), "assets/NotoSans-Regular.ttf");
    const fontBytes = fs.readFileSync(fontPath);
    const font = await pdfDoc.embedFont(fontBytes);

    const page = pdfDoc.addPage([595, 842]);
    const { width } = page.getSize();
    const left = 52;
    const right = width - 52;

    const tableLeft = 58;
    const tableWidth = 480;
    const colQty = 380;
    const colPrice = 420;
    const colOffer = 470;
    const colTotal = 530;
    let y = 820;


    const navy = rgb(0.07, 0.11, 0.20);
    const orange = rgb(0.96, 0.50, 0.10);

    y = 810;


    page.drawImage(logoImage, {
      x: 52,
      y: 777,
      width: 38,
      height: 38,
    });

    page.drawText("SIVAKASI PYRO PARK", {
      x: 110,
      y: 805,
      size: 21,
      font,
    });

    page.drawText("Premium Fireworks & Crackers", {
      x: 110,
      y: 786,
      size: 10,
      font,
      color: rgb(.35, .35, .35)
    });

    page.drawText("+91 9994252823", {
      x: 110,
      y: 765,
      size: 10,
      font,
    });

    page.drawText("svkorders@gmail.com", {
      x: 110,
      y: 750,
      size: 10,
      font,
    });

    page.drawText(
      "5/590N, New Colony, Poolavoorani,\nSivakasi, Tamil Nadu 626189",
      {
        x: 110,
        y: 730,
        size: 8,
        lineHeight: 10,
        font,
      });

    page.drawRectangle({
      x: 430,
      y: 765,
      width: 112,
      height: 52,
      borderColor: orange,
      borderWidth: 0.6,
    });

    page.drawText("IMPORTANT", {
      x: 438,
      y: 796,
      size: 9,
      font,
      color: orange,
    });

    page.drawText("No Home Delivery", {
      x: 438,
      y: 783,
      size: 7,
      font,
    });

    page.drawText("Transportation paid by customer", {
      x: 438,
      y: 773,
      size: 7,
      font,
    });

    page.drawText("Min: TN-3000 | Other-5000", {
      x: 438,
      y: 763,
      size: 7,
      font,
    });

    page.drawLine({
      start: { x: 50, y: 730 },
      end: { x: 545, y: 730 },
      thickness: .6,
      color: rgb(.85, .85, .85)
    });

    y = 710;

    const address =
      order.address ??
      order.shippingAddress ??
      "";
    const addressLines = address
      .split("\n")
      .filter((x: string) => x.trim());

    addressLines.forEach((line: string) => {
      page.drawText(line, {
        x: 52,
        y,
        size: 9,
        font,
        color: rgb(.35, .35, .35)
      });

      y -= 11;
    });


    y -= 8;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 545, y },
      thickness: .6,
      color: rgb(.85, .85, .85)
    });

    y -= 10;

    page.drawText(`Order ID : ${order.orderId}`, {
      x: 52,
      y,
      size: 9,
      font,
    });

    page.drawText(
      `Date : ${new Date(order.createdAt).toLocaleDateString("en-IN")}`,
      {
        x: 250,
        y,
        size: 9,
        font,
      });

    page.drawText(
      `Payment : ${order.paymentMode}`,
      {
        x: 438,
        y,
        size: 9,
        font,
      });

    y -= 42;







    const border = rgb(0.86, 0.86, 0.86);
    const grayText = rgb(0.45, 0.45, 0.45);
    const green = rgb(0.02, 0.55, 0.18);
    const blue = rgb(0.08, 0.35, 0.82);

    const rowHeight = 28;

    page.drawRectangle({
      x: tableLeft,
      y,
      width: tableWidth,
      height: rowHeight,
      color: navy,
    });

    page.drawText("Product", {
      x: tableLeft + 8,
      y: y + 7,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText("Qty", {
      x: colQty,
      y: y + 7,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText("MRP", {
      x: colPrice,
      y: y + 7,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText("Offer", {
      x: colOffer,
      y: y + 7,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText("Total", {
      x: colTotal,
      y: y + 7,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    y -= rowHeight;


    order.items.forEach((item: any) => {

      const hasDiscount =
        item.originalPrice &&
        item.originalPrice > item.price;

      const rowHeight =
        item.isComboPackage
          ? (hasDiscount ? 48 : 40)
          : (hasDiscount ? 38 : 30);

      page.drawRectangle({
        x: tableLeft,
        y: y - rowHeight + 2,
        width: tableWidth,
        height: rowHeight,
        borderColor: border,
        borderWidth: .5,
      });

      const name =
        item.name.length > 38
          ? item.name.substring(0, 38) + "..."
          : item.name;

      page.drawText(name, {
        x: tableLeft + 8,
        y: y - 16,
        size: 9,
        font,
      });

      if (item.isComboPackage) {

        page.drawText(
          "(Combo Package)",
          {
            x: tableLeft + 8,
            y: y - 30,
            size: 7,
            font,
            color: blue,
          }
        );

      }

      const qtyText = String(item.quantity);

      const qtyWidth = font.widthOfTextAtSize(qtyText, 9);

      page.drawText(
        String(item.quantity),
        {
          x: colQty + 18 - qtyWidth / 2,
          y: y - 16,
          size: 9,
          font,
        }
      );
      if (hasDiscount) {

        page.drawText(
          `₹${item.originalPrice}`,
          {
            x: colPrice,
            y: y - 15,
            size: 8,
            font,
            color: grayText,
          }
        );

        const w = font.widthOfTextAtSize(
          `₹${item.originalPrice}`,
          8
        );

        page.drawLine({
          start: {
            x: colPrice,
            y: y - 9
          },
          end: {
            x: colPrice + w,
            y: y - 9
          },
          thickness: .7,
          color: grayText,
        });

        page.drawText(
          `₹${item.price}`,
          {
            x: colOffer,
            y: y - 14,
            size: 9,
            font,
          }
        );

        if (item.discountText) {

          page.drawText(
            item.discountText,
            {
              x: colOffer,
              y: y - 26,
              size: 7,
              font,
              color: green,
            }
          );

        }

      }
      else {

        page.drawText(
          `₹${item.price}`,
          {
            x: colOffer,
            y: y - 14,
            size: 9,
            font,
          }
        );

      }
      const totalText = `₹${item.total}`;

      const totalWidth =
        font.widthOfTextAtSize(
          totalText,
          9
        );

      page.drawText(
        totalText,
        {
          x: tableLeft + tableWidth - totalWidth - 8,
          y: y - 14,
          size: 9,
          font,
        }
      );

      y -= rowHeight;

    });


    page.drawLine({
      start: { x: tableLeft, y },
      end: {
        x: tableLeft + tableWidth,
        y,
      },
      thickness: .6,
      color: border,
    });

    y -= 10;

    const subtotal = Number(order.subtotal || 0);
    const comboAmount = Number(order.comboAmount || 0);
    const eligibleChargeAmount = Number(order.eligibleChargeAmount || subtotal);
    const packaging = Number(order.packagingCharge || 0);
    const gst = Number(order.gstAmount || 0);
    const totalAmount = Number(order.totalAmount || 0);
    const walletUsed = Number(order.walletUsed || 0);
    const finalPayable = Number(order.finalPayable || totalAmount);

    const summaryLeft = tableLeft;
    const summaryWidth = tableWidth;
    const summaryHeaderHeight = 22;

    /* Summary Header */

    page.drawRectangle({
      x: summaryLeft,
      y,
      width: summaryWidth,
      height: summaryHeaderHeight,
      color: navy,
    });
    const summaryTitle = "Invoice Summary";
    const summaryTitleWidth = font.widthOfTextAtSize(summaryTitle, 10);

    page.drawText(summaryTitle, {
      x: summaryLeft + (summaryWidth - summaryTitleWidth) / 2,
      y: y + 6,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });


    y -= summaryHeaderHeight;


    function drawSummaryRow(
      label: string,
      value: string,
      isGreen = false
    ) {
      page.drawRectangle({
        x: summaryLeft,
        y,
        width: summaryWidth,
        height: rowHeight,
        borderWidth: .4,
        borderColor: border,
      });

      page.drawLine({
        start: {
          x: summaryLeft + 235,
          y
        },
        end: {
          x: summaryLeft + 235,
          y: y + rowHeight
        },
        thickness: .4,
        color: border,
      });

      page.drawText(label, {
        x: summaryLeft + 10,
        y: y + 6,
        size: 9,
        font,
        color: isGreen ? green : rgb(0, 0, 0),
      });

      const w = font.widthOfTextAtSize(value, 9);

      page.drawText(value, {
        x: summaryLeft + summaryWidth - w - 10,
        y: y + 6,
        size: 9,
        font,
        color: isGreen ? green : rgb(0, 0, 0),
      });

      y -= rowHeight;
    }

    drawSummaryRow("Subtotal", `₹${subtotal}`);

    if (comboAmount > 0) {

      drawSummaryRow(
        "Combo Package Amount",
        `₹${comboAmount}`
      );

      drawSummaryRow(
        "GST Eligible Amount",
        `₹${eligibleChargeAmount}`
      );

    }

    drawSummaryRow(
      comboAmount > 0
        ? "Packaging"
        : "Packaging Charge",
      `₹${packaging}`
    );

    if (gst > 0) {

      drawSummaryRow(
        "GST",
        `₹${gst}`
      );

    }

    if (walletUsed > 0) {

      drawSummaryRow(
        "Wallet Used",
        `-₹${walletUsed}`,
        true
      );

    }
    page.drawRectangle({
      x: summaryLeft,
      y,
      width: summaryWidth,
      height: 26,
      color: navy,
    });

    page.drawLine({
      start: {
        x: summaryLeft + 235,
        y
      },
      end: {
        x: summaryLeft + 235,
        y: y + 26
      },
      thickness: .5,
      color: rgb(1, 1, 1),
    });

    page.drawText(
      "Grand Total",
      {
        x: summaryLeft + 10,
        y: y + 7,
        size: 12,
        font,
        color: rgb(1, 1, 1),
      });

    const totalWidth =
      font.widthOfTextAtSize(
        `₹${finalPayable}`,
        12
      );

    page.drawText(
      `₹${finalPayable}`,
      {
        x: summaryLeft + summaryWidth - totalWidth - 10,
        y: y + 7,
        size: 12,
        font,
        color: rgb(1, 1, 1),
      });

    y -= 55;

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