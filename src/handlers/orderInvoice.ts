import { verifyJwt } from "../utils/auth";
import { OrderRepository } from "../repo/order.repo";
import { AdminConfigService } from "../services/adminConfig.service";
import { AdminConfigRepo } from "../repo/adminConfig.repo";
import { buildInvoicePdf } from "../pdf/invoiceBuilder";

const repo = new OrderRepository();
export const handler = async (event: any) => {

  try {
    verifyJwt(event);

    const repoconfig = new AdminConfigRepo();
    const serviceconfig = new AdminConfigService(repoconfig);
    const config = await serviceconfig.getConfig();

    const orderId = event.pathParameters?.orderId;
    if (!orderId) {
      return { statusCode: 400, body: "orderId required" };
    }

    const order = await repo.getById(orderId);
    if (!order) {
      return { statusCode: 404, body: "Order not found" };
    }

    const doc = await buildInvoicePdf(order, config);
    const pdfBytes = doc.output("arraybuffer");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=invoice-${order.orderId}.pdf`,
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