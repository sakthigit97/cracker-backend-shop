import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { verifyJwt } from "../utils/auth";
import { OrderRepository } from "../repo/order.repo";
import { AdminConfigService } from "../services/adminConfig.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";

const repo = new OrderRepository();
export const handler = async (event: any) => {
  const repoconfig = new AdminConfigRepo();
  const serviceconfig = new AdminConfigService(repoconfig);
  const config = await serviceconfig.getConfig();
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
    const tableLeft = 52;
    const tableWidth = 490;
    const colQty = 350;
    const colPrice = 390;
    const colOffer = 440;
    const colTotal = 500;
    let y = 820;
    const navy = rgb(
      15 / 255,
      23 / 255,
      42 / 255
    );
    const orange = rgb(0.96, 0.50, 0.10);
    y = 810;

    page.drawImage(logoImage, {
      x: 52,
      y: 775,
      width: 42,
      height: 42,
    });

    page.drawText(config?.companyName || "SIVAKASI PYRO PARK", {
      x: 110,
      y: 800,
      size: 18,
      font,
    });

    page.drawText("Premium Fireworks & Crackers", {
      x: 110,
      y: 786,
      size: 8,
      font,
      color: rgb(.42, .42, .42)
    });

    page.drawText(config?.adminMobile, {
      x: 110,
      y: 765,
      size: 8,
      font,
    });

    page.drawText(config?.adminEmail, {
      x: 110,
      y: 750,
      size: 8,
      font,
    });

    page.drawText(
      config?.adminAddress || "5/590N, New Colony, Poolavoorani,\nSivakasi, Tamil Nadu 626189",
      {
        x: 110,
        y: 730,
        size: 7.5,
        lineHeight: 9,
        font,
      });

    page.drawLine({
      start: { x: 50, y: 710 },
      end: { x: 545, y: 710 },
      thickness: .8,
      color: rgb(.78, .78, .78)
    });
    y = 690;

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

    y -= 42;


    const border = rgb(0.86, 0.86, 0.86);
    const grayText = rgb(0.45, 0.45, 0.45);
    const green = rgb(0.02, 0.55, 0.18);
    const blue = rgb(0.08, 0.35, 0.82);
    const headerHeight = 21;
    const rowHeight = 26;

    page.drawRectangle({
      x: tableLeft,
      y,
      width: tableWidth,
      height: headerHeight,
      color: navy,
    });

    page.drawText("Product", {
      x: tableLeft + 8,
      y: y + 6,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText("Qty", {
      x: colQty,
      y: y + 6,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText("MRP", {
      x: colPrice,
      y: y + 6,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText("Offer", {
      x: colOffer,
      y: y + 6,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText("Total", {
      x: colTotal,
      y: y + 6,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });
    y -= headerHeight;
    console.log("Header ends at:", y);
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
        y,
        width: tableWidth,
        height: rowHeight,
        borderColor: border,
        borderWidth: .8,
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

    y -= 32;

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
    const summaryHeaderHeight = 24;

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
      y: y + 7,
      size: 9,
      font,
      color: rgb(1, 1, 1),
    });

    y -= summaryHeaderHeight + 3;
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
        y: y + 7,
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