import PDFDocument from "pdfkit";
import { formatInvoiceNumber } from "./brandSettings.js";

const PAYMENT_LABELS = { cod: "CASH ON DELIVERY", razorpay: "ONLINE (RAZORPAY)", stripe: "ONLINE (CARD)" };

// brand = getBrand() ka jawab (naam, legalName, gstin, address, support, tagline, invoicePrefix).
// Sab kuch Admin -> Settings se aata hai; koi client ka naam yahan hardcoded nahi.
const generateInvoicePDF = (order, user = {}, brand = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const storeName = brand.name || process.env.CLIENT_NAME || "Store";
      const sellerName = brand.legalName || storeName;
      const invoiceNumber = formatInvoiceNumber(order, brand.invoicePrefix ?? "INV-");
      const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 20, left: 50, right: 50 } });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const primaryColor = "#6366f1";
      const darkColor = "#1e1e2e";
      const grayColor = "#6b7280";
      const lightGray = "#f3f4f6";

      const pricing = order.pricing || {};
      const pageWidth = doc.page.width - 100; // margins ke baad

      // ─── HEADER ───────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);

      doc
        .fillColor("white")
        .fontSize(26)
        .font("Helvetica-Bold")
        .text(storeName, 50, 24, { width: 330, height: 32, ellipsis: true });

      // Seller block: tagline, legal naam (agar store naam se alag), address, GSTIN, support
      const support = [brand.supportEmail, brand.supportPhone].filter(Boolean).join("  |  ");
      const sellerLines = [
        brand.tagline,
        sellerName !== storeName ? sellerName : "",
        brand.address,
        brand.gstin ? `GSTIN: ${brand.gstin}` : "",
        support,
      ].filter(Boolean);

      doc.fillColor("white").fontSize(9).font("Helvetica");
      sellerLines.forEach((line, i) => {
        doc.text(line, 50, 58 + i * 12, { width: 330, height: 11, ellipsis: true });
      });

      doc
        .fillColor("white")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("INVOICE", 400, 35, { align: "right" })
        .fontSize(11)
        .font("Helvetica")
        .fontSize(10)
        .text(invoiceNumber, 400, 65, { align: "right", width: 145, height: 12, ellipsis: true })
        .fontSize(11)
        .text(
          new Date(order.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          400,
          82,
          { align: "right" }
        );

      // ─── BILL TO + ORDER INFO ─────────────────────────────
      doc.moveDown(4);
      const infoY = 145;

      // Bill To Box
      doc.rect(50, infoY, 240, 100).fill(lightGray);
      doc
        .fillColor(grayColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("BILL TO", 65, infoY + 12);

      doc
        .fillColor(darkColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(user.name || "Customer", 65, infoY + 28);

      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font("Helvetica")
        .text(user.email || "", 65, infoY + 46)
        .text(user.phone || "", 65, infoY + 62);

      // Shipping Address Box
      doc.rect(310, infoY, 240, 100).fill(lightGray);
      doc
        .fillColor(grayColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("SHIP TO", 325, infoY + 12);

      const addr = order.shippingAddress;
      if (addr) {
        doc
          .fillColor(darkColor)
          .fontSize(10)
          .font("Helvetica")
          .text(addr.fullName || addr.name || user.name || "", 325, infoY + 28)
          .text(
            [addr.addressLine1 || addr.street, addr.addressLine2].filter(Boolean).join(", "),
            325,
            infoY + 42,
            { width: 210, height: 24 }
          )
          .text(
            `${addr.city || ""}, ${addr.state || ""} - ${addr.pincode || addr.zipCode || ""}`,
            325,
            infoY + 68
          );
      }

      // Order Status + Payment
      doc
        .fillColor(grayColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("ORDER STATUS", 50, infoY + 115)
        .text("PAYMENT METHOD", 200, infoY + 115)
        .text("PAYMENT STATUS", 370, infoY + 115);

      doc
        .fillColor(darkColor)
        .fontSize(10)
        .font("Helvetica")
        .text(String(order.orderStatus || "placed").toUpperCase(), 50, infoY + 130)
        .text(
          PAYMENT_LABELS[order.paymentMethod] || String(order.paymentMethod || "").toUpperCase(),
          200,
          infoY + 130
        )
        .text(
          String(order.paymentStatus || "pending").toUpperCase(),
          370,
          infoY + 130
        );

      // ─── ITEMS TABLE ──────────────────────────────────────
      const tableTop = infoY + 160;

      // Table Header
      doc.rect(50, tableTop, pageWidth, 28).fill(primaryColor);

      doc
        .fillColor("white")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("ITEM", 65, tableTop + 9)
        .text("QTY", 340, tableTop + 9, { width: 60, align: "center" })
        .text("PRICE", 395, tableTop + 9, { width: 80, align: "right" })
        .text("TOTAL", 480, tableTop + 9, { width: 55, align: "right" });

      // Table Rows
      let rowY = tableTop + 28;
      const items = order.items || [];

      items.forEach((item, index) => {
        const isEven = index % 2 === 0;
        const rowHeight = 35;

        if (rowY + rowHeight > doc.page.height - 250) {
          doc.addPage();
          rowY = 50;
        }

        if (isEven) {
          doc.rect(50, rowY, pageWidth, rowHeight).fill("#fafafa");
        }

        const productName =
          (item.product?.name || item.name || "Product") +
          (item.variantLabel ? ` (${item.variantLabel})` : "");
        const quantity = item.quantity || 1;
        const price = item.price || item.product?.price || 0;
        const total = price * quantity;

        doc
          .fillColor(darkColor)
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(productName, 65, rowY + 8, { width: 260 });

        if (item.size || item.color) {
          doc
            .fillColor(grayColor)
            .fontSize(8)
            .font("Helvetica")
            .text(
              [item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`]
                .filter(Boolean)
                .join(" | "),
              65,
              rowY + 22
            );
        }

        doc
          .fillColor(darkColor)
          .fontSize(10)
          .font("Helvetica")
          .text(quantity.toString(), 340, rowY + 12, {
            width: 60,
            align: "center",
          })
          .text(`Rs.${price.toLocaleString("en-IN")}`, 395, rowY + 12, {
            width: 80,
            align: "right",
          })
          .text(`Rs.${total.toLocaleString("en-IN")}`, 480, rowY + 12, {
            width: 55,
            align: "right",
          });

        rowY += rowHeight;
      });

      // ─── TOTALS ───────────────────────────────────────────
      const totalSectionY = rowY + 20;

      // Divider line
      doc
        .moveTo(50, rowY + 8)
        .lineTo(50 + pageWidth, rowY + 8)
        .strokeColor("#e5e7eb")
        .lineWidth(1)
        .stroke();

      const totalX = 370;
      const totalWidth = pageWidth - 320;

      const addTotalRow = (label, value, y, bold = false, color = darkColor) => {
        doc
          .fillColor(grayColor)
          .fontSize(10)
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .text(label, totalX, y);
        doc
          .fillColor(color)
          .fontSize(10)
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .text(value, totalX, y, { width: totalWidth, align: "right" });
      };

      let tY = totalSectionY;
      addTotalRow(
        "Subtotal:",
        `Rs.${(pricing.subtotal || pricing.total)?.toLocaleString("en-IN")}`,
        tY
      );

      if (pricing.couponDiscount > 0 || pricing.discount > 0) {
        tY += 20;
        addTotalRow(
          `Discount${order.couponCode ? ` (${order.couponCode})` : ""}:`,
          `-Rs.${(pricing.couponDiscount || pricing.discount || 0).toLocaleString("en-IN")}`,
          tY,
          false,
          "#16a34a"
        );
      }

      tY += 20;
      addTotalRow(
        "Delivery:",
        pricing.shippingCharge === 0
          ? "FREE"
          : `Rs.${(pricing.shippingCharge || 0).toLocaleString("en-IN")}`,
        tY,
        false,
        pricing.shippingCharge === 0 ? "#16a34a" : darkColor
      );

      // GST: total = subtotal - discount + delivery + tax, isliye tax ki line zaroori hai
      if (pricing.tax > 0) {
        tY += 20;
        addTotalRow("Tax (GST):", `Rs.${pricing.tax.toLocaleString("en-IN")}`, tY);
      }

      // Total Box
      tY += 15;
      doc.rect(totalX - 10, tY, totalWidth + 10, 35).fill(primaryColor);
      doc
        .fillColor("white")
        .fontSize(13)
        .font("Helvetica-Bold")
        .text("TOTAL:", totalX, tY + 10)
        .text(
          `Rs.${(pricing.total || 0).toLocaleString("en-IN")}`,
          totalX,
          tY + 10,
          { width: totalWidth - 10, align: "right" }
        );

      // ─── FOOTER ───────────────────────────────────────────
      const footerY = doc.page.height - 80;

      doc
        .moveTo(50, footerY - 10)
        .lineTo(50 + pageWidth, footerY - 10)
        .strokeColor("#e5e7eb")
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(grayColor)
        .fontSize(9)
        .font("Helvetica")
        .text("Thank you for shopping with us! This is a computer-generated invoice.", 50, footerY, {
          align: "center",
          width: pageWidth,
        });
      if (support) {
        doc.text(`For support: ${support}`, 50, footerY + 14, { align: "center", width: pageWidth });
      }
      doc.text(
        `© ${new Date().getFullYear()} ${sellerName}. All rights reserved.`,
        50,
        footerY + 28,
        { align: "center", width: pageWidth }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export default generateInvoicePDF;