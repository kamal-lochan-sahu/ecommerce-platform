import nodemailer from "nodemailer";
import handlebars from "handlebars";
import juice from "juice";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Transporter ─────────────────────────────────────────────
const createTransporter = () => {
  if (process.env.EMAIL_PROVIDER === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // App password use karo
      },
    });
  }

  // Default: SMTP (Mailtrap dev / SendGrid prod)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ─── Template Compiler ───────────────────────────────────────
const compileTemplate = (templateName, data) => {
  const templatePath = path.join(
    __dirname,
    "../templates/emails",
    `${templateName}.hbs`
  );

  if (!fs.existsSync(templatePath)) {
    // Fallback: inline templates
    return inlineTemplates[templateName]?.(data) || "";
  }

  const source = fs.readFileSync(templatePath, "utf8");
  const template = handlebars.compile(source);
  const html = template(data);
  return juice(html); // CSS inline karo email clients ke liye
};

// ─── Inline Templates (file nahi chahiye) ────────────────────
const inlineTemplates = {
  orderConfirmation: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .body { padding: 30px; }
        .order-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .item-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .total-row { display: flex; justify-content: space-between; padding: 12px 0; font-weight: bold; font-size: 18px; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .status-badge { display: inline-block; background: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Order Confirmed!</h1>
          <p style="margin:8px 0 0; opacity:0.9">Thank you for your order, ${data.customerName}!</p>
        </div>
        <div class="body">
          <p>Hi <strong>${data.customerName}</strong>,</p>
          <p>Your order has been placed successfully. Here are your order details:</p>
          
          <div class="order-box">
            <div style="margin-bottom:16px">
              <strong>Order ID:</strong> #${data.orderId} &nbsp;
              <span class="status-badge">Confirmed</span>
            </div>
            <div><strong>Order Date:</strong> ${data.orderDate}</div>
            <div style="margin-top:8px"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</div>
          </div>

          <h3 style="border-bottom: 2px solid #667eea; padding-bottom: 8px;">Order Items</h3>
          ${data.items
            .map(
              (item) => `
            <div class="item-row">
              <div>
                <strong>${item.name}</strong><br>
                <small style="color:#666">Qty: ${item.quantity} | Size: ${item.size || "N/A"}</small>
              </div>
              <div>₹${(item.price * item.quantity).toLocaleString()}</div>
            </div>
          `
            )
            .join("")}
          
          <div style="margin-top:16px; padding-top:8px">
            <div class="item-row"><div>Subtotal</div><div>₹${data.subtotal?.toLocaleString()}</div></div>
            ${data.discount > 0 ? `<div class="item-row" style="color:#28a745"><div>Discount (${data.couponCode || ""})</div><div>-₹${data.discount?.toLocaleString()}</div></div>` : ""}
            <div class="item-row"><div>Delivery</div><div>${data.deliveryCharge === 0 ? "FREE" : "₹" + data.deliveryCharge}</div></div>
            <div class="total-row"><div>Total Paid</div><div>₹${data.totalAmount?.toLocaleString()}</div></div>
          </div>

          <div class="order-box" style="margin-top:24px">
            <strong>📍 Delivery Address</strong><br>
            <div style="margin-top:8px; color:#555; line-height:1.6">
              ${data.shippingAddress?.street}, ${data.shippingAddress?.city}<br>
              ${data.shippingAddress?.state} - ${data.shippingAddress?.pincode}
            </div>
          </div>

          <div style="text-align:center; margin-top:24px">
            <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}" class="btn">Track Your Order →</a>
          </div>
        </div>
        <div class="footer">
          <p>Questions? Reply to this email or contact us at ${process.env.SUPPORT_EMAIL || "support@myshop.com"}</p>
          <p style="margin-top:8px">© ${new Date().getFullYear()} MyShop. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderShipped: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; }
        .body { padding: 30px; }
        .tracking-box { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
        .btn { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .step { display: flex; align-items: center; padding: 10px 0; }
        .step-dot { width: 12px; height: 12px; border-radius: 50%; background: #ccc; margin-right: 16px; flex-shrink: 0; }
        .step-dot.active { background: #f5576c; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚚 Your Order is On the Way!</h1>
          <p style="margin:8px 0 0; opacity:0.9">Order #${data.orderId}</p>
        </div>
        <div class="body">
          <p>Hi <strong>${data.customerName}</strong>,</p>
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          
          <div class="tracking-box">
            <div style="font-size:14px; color:#856404; margin-bottom:8px">Tracking Number</div>
            <div style="font-size:24px; font-weight:bold; letter-spacing:2px; color:#333">${data.trackingNumber}</div>
            <div style="font-size:13px; color:#856404; margin-top:8px">via ${data.courierName}</div>
          </div>

          <div style="margin: 24px 0">
            <div class="step"><div class="step-dot active"></div><div><strong>Order Placed</strong> — ${data.orderDate}</div></div>
            <div class="step"><div class="step-dot active"></div><div><strong>Order Confirmed</strong></div></div>
            <div class="step"><div class="step-dot active"></div><div><strong>Shipped</strong> — ${new Date().toLocaleDateString("en-IN")}</div></div>
            <div class="step"><div class="step-dot"></div><div style="color:#999">Out for Delivery</div></div>
            <div class="step"><div class="step-dot"></div><div style="color:#999">Delivered</div></div>
          </div>

          <p><strong>Expected Delivery:</strong> ${data.estimatedDelivery}</p>

          <div style="text-align:center; margin-top:24px">
            <a href="${data.trackingUrl || `${process.env.FRONTEND_URL}/orders/${data.orderId}`}" class="btn">Track Package →</a>
          </div>
        </div>
        <div class="footer">© ${new Date().getFullYear()} MyShop | <a href="${process.env.FRONTEND_URL}">Visit Store</a></div>
      </div>
    </body>
    </html>
  `,

  orderDelivered: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; }
        .body { padding: 30px; }
        .review-box { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
        .star { font-size: 28px; cursor: pointer; }
        .btn { display: inline-block; background: #11998e; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 8px; }
        .btn-outline { display: inline-block; border: 2px solid #11998e; color: #11998e; padding: 10px 28px; border-radius: 6px; text-decoration: none; margin: 8px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Order Delivered!</h1>
          <p style="margin:8px 0 0; opacity:0.9">Order #${data.orderId} has been delivered</p>
        </div>
        <div class="body">
          <p>Hi <strong>${data.customerName}</strong>,</p>
          <p>Your order has been successfully delivered! We hope you love your purchase.</p>
          
          <div class="review-box">
            <p style="font-size:16px; font-weight:bold; margin-bottom:8px">How was your experience?</p>
            <p style="color:#666; font-size:14px; margin-bottom:16px">Your feedback helps us improve</p>
            <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}/review" class="btn">⭐ Write a Review</a>
          </div>

          <p style="text-align:center">
            <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}/return" class="btn-outline">Return/Exchange</a>
            <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}/invoice" class="btn">Download Invoice</a>
          </p>

          ${
            data.loyaltyPointsEarned
              ? `<div style="background:#e8f5e9; border-radius:8px; padding:16px; margin-top:16px; text-align:center">
            <strong>🏆 You earned ${data.loyaltyPointsEarned} loyalty points!</strong><br>
            <small style="color:#555">Total balance: ${data.totalLoyaltyPoints} points</small>
          </div>`
              : ""
          }
        </div>
        <div class="footer">© ${new Date().getFullYear()} MyShop | <a href="${process.env.FRONTEND_URL}">Shop Again</a></div>
      </div>
    </body>
    </html>
  `,

  abandonedCart: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%); color: white; padding: 30px; text-align: center; }
        .body { padding: 30px; }
        .cart-item { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
        .item-img { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; background: #f0f0f0; margin-right: 16px; }
        .coupon-box { background: #fff3cd; border: 2px dashed #ffc107; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
        .coupon-code { font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #e67e22; }
        .btn { display: inline-block; background: linear-gradient(135deg, #fc4a1a, #f7b733); color: white; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 You left something behind!</h1>
          <p style="margin:8px 0 0; opacity:0.9">Your cart is waiting for you, ${data.customerName}</p>
        </div>
        <div class="body">
          <p>Hi <strong>${data.customerName}</strong>,</p>
          <p>Looks like you forgot to complete your purchase. Don't worry — your cart is saved!</p>
          
          <h3 style="border-bottom: 2px solid #fc4a1a; padding-bottom: 8px;">Items in your cart</h3>
          ${data.cartItems
            .slice(0, 3)
            .map(
              (item) => `
            <div class="cart-item">
              <img src="${item.image || ""}" alt="${item.name}" class="item-img" />
              <div style="flex:1">
                <div style="font-weight:bold">${item.name}</div>
                <div style="color:#666; font-size:13px">Qty: ${item.quantity}</div>
              </div>
              <div style="font-weight:bold">₹${(item.price * item.quantity).toLocaleString()}</div>
            </div>
          `
            )
            .join("")}
          ${data.cartItems.length > 3 ? `<p style="color:#666; font-size:14px; margin-top:8px">+ ${data.cartItems.length - 3} more items</p>` : ""}

          <div style="text-align:right; margin-top:12px; font-size:18px; font-weight:bold">
            Cart Total: ₹${data.cartTotal?.toLocaleString()}
          </div>

          ${
            data.discountCode
              ? `
          <div class="coupon-box">
            <p style="margin:0 0 8px; font-weight:bold">🎁 Special offer just for you!</p>
            <div class="coupon-code">${data.discountCode}</div>
            <p style="margin:8px 0 0; color:#666; font-size:13px">Use this code for ${data.discountPercent}% OFF. Valid for 24 hours only!</p>
          </div>`
              : ""
          }

          <div style="text-align:center; margin-top:24px">
            <a href="${process.env.FRONTEND_URL}/cart" class="btn">Complete My Purchase →</a>
          </div>

          <p style="color:#999; font-size:12px; text-align:center; margin-top:24px">
            If you don't want these reminders, <a href="${process.env.FRONTEND_URL}/unsubscribe" style="color:#999">unsubscribe here</a>.
          </p>
        </div>
        <div class="footer">© ${new Date().getFullYear()} MyShop</div>
      </div>
    </body>
    </html>
  `,

  lowStockAlert: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%); color: #333; padding: 30px; text-align: center; }
        .body { padding: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f8f9fa; padding: 10px 12px; text-align: left; font-size: 13px; color: #666; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
        .critical { background: #ffe0e0; }
        .warning { background: #fff3cd; }
        .stock-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
        .stock-critical { background: #dc3545; color: white; }
        .stock-warning { background: #ffc107; color: #333; }
        .btn { display: inline-block; background: #f7971e; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Low Stock Alert</h1>
          <p style="margin:8px 0 0;">${data.criticalCount} products need immediate attention</p>
        </div>
        <div class="body">
          <p>Hi Admin,</p>
          <p>The following products are running low on stock and require restocking:</p>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Threshold</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (p) => `
                <tr class="${p.stock === 0 ? "critical" : "warning"}">
                  <td><strong>${p.name}</strong></td>
                  <td style="font-family:monospace; font-size:12px">${p.sku || "N/A"}</td>
                  <td>${p.category}</td>
                  <td>
                    <span class="stock-badge ${p.stock === 0 ? "stock-critical" : "stock-warning"}">
                      ${p.stock === 0 ? "OUT OF STOCK" : p.stock + " left"}
                    </span>
                  </td>
                  <td>${p.lowStockThreshold}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div style="text-align:center; margin-top:24px">
            <a href="${process.env.ADMIN_URL || process.env.FRONTEND_URL + "/admin"}/products?filter=low-stock" class="btn">Manage Inventory →</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated alert from MyShop Admin</p>
          <p>Sent at: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

// ─── Main Send Function ───────────────────────────────────────
const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    const transporter = createTransporter();

    const emailHtml = html || compileTemplate(template, data);

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || "MyShop"}" <${process.env.EMAIL_FROM || "noreply@myshop.com"}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html: emailHtml,
      text: text || emailHtml.replace(/<[^>]*>/g, ""), // HTML se plain text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
    return { success: false, error: error.message };
  }
};

// ─── Specific Email Senders ───────────────────────────────────
export const sendOrderConfirmationEmail = async (order, user) => {
  const items = order.items.map((item) => ({
    name: item.product?.name || "Product",
    quantity: item.quantity,
    price: item.price,
    size: item.size,
    image: item.product?.images?.[0],
  }));

  return sendEmail({
    to: user.email,
    subject: `✅ Order Confirmed — #${order._id.toString().slice(-8).toUpperCase()} | MyShop`,
    template: "orderConfirmation",
    data: {
      customerName: user.name,
      orderId: order._id.toString().slice(-8).toUpperCase(),
      orderDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
      estimatedDelivery: new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-IN"),
      items,
      subtotal: order.subtotal,
      discount: order.discount || 0,
      couponCode: order.couponCode,
      deliveryCharge: order.deliveryCharge || 0,
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress,
    },
  });
};

export const sendOrderShippedEmail = async (order, user, trackingInfo) => {
  return sendEmail({
    to: user.email,
    subject: `🚚 Your Order #${order._id.toString().slice(-8).toUpperCase()} has been Shipped!`,
    template: "orderShipped",
    data: {
      customerName: user.name,
      orderId: order._id.toString().slice(-8).toUpperCase(),
      orderDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
      estimatedDelivery: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-IN"),
      trackingNumber: trackingInfo?.trackingNumber || "TRK" + Date.now(),
      courierName: trackingInfo?.courierName || "Shiprocket",
      trackingUrl: trackingInfo?.trackingUrl,
    },
  });
};

export const sendOrderDeliveredEmail = async (order, user) => {
  return sendEmail({
    to: user.email,
    subject: `🎉 Your Order #${order._id.toString().slice(-8).toUpperCase()} has been Delivered!`,
    template: "orderDelivered",
    data: {
      customerName: user.name,
      orderId: order._id.toString().slice(-8).toUpperCase(),
      loyaltyPointsEarned: order.loyaltyPointsEarned,
      totalLoyaltyPoints: user.loyaltyPoints,
    },
  });
};

export const sendAbandonedCartEmail = async (user, cart) => {
  // Auto-generate 10% coupon for abandoned cart
  const discountCode = `CART${user._id.toString().slice(-4).toUpperCase()}`;

  return sendEmail({
    to: user.email,
    subject: `🛒 You left something in your cart! Complete your order`,
    template: "abandonedCart",
    data: {
      customerName: user.name,
      cartItems: cart.items.map((item) => ({
        name: item.product?.name || "Product",
        quantity: item.quantity,
        price: item.product?.price || 0,
        image: item.product?.images?.[0],
      })),
      cartTotal: cart.items.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0
      ),
      discountCode,
      discountPercent: 10,
    },
  });
};

export const sendLowStockAlertEmail = async (products) => {
  const criticalProducts = products.filter((p) => p.stock === 0);
  const warningProducts = products.filter((p) => p.stock > 0);

  return sendEmail({
    to: process.env.ADMIN_EMAIL || "admin@myshop.com",
    subject: `⚠️ Low Stock Alert — ${products.length} products need attention`,
    template: "lowStockAlert",
    data: {
      products: [...criticalProducts, ...warningProducts],
      criticalCount: criticalProducts.length,
    },
  });
};

export default sendEmail;