import { User } from '../models/index.js';
import { sendMail, sendSms } from './messaging.service.js';
import { getBrand } from './brand.service.js';
import { isPlaceholderEmail } from '../utils/identity.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import logger from '../utils/logger.js';

// Order ke status badalne par customer ko EMAIL + SMS (in-app notification alag se jaati hai).
//
//   event      email   sms
//   shipped     yes    yes   (courier + tracking ke saath)
//   delivered   yes    yes
//   cancelled   yes    yes   (admin ne cancel kiya; refund note agar paisa liya ja chuka)
//   returned    yes    no
//   placed       no    yes   (email = order confirmation email, sent separately)
//   refunded    yes    yes
//
// Design rules:
//  - Kabhi throw nahi karta aur order flow ko rokta nahi (fire-and-forget, jaise confirmation email).
//  - Naam, support contact, site link sab getBrand() se: koi client ka naam hardcoded nahi.
//  - Provider (console / smtp / twilio) messaging.service.js chunta hai, yahan sirf message banta hai.
//  - Sirf wahi links jo sach mein exist karte hain (/orders/:id).

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
// SMS mein ₹ nahi: wo non-GSM character hai, poora SMS Unicode ban jaata hai (70 char/segment) aur kharcha ~2-3x
// ho jaata hai. "Rs." se SMS GSM-7 (160 char/segment) rehta hai.
const smsMoney = (n) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;
const isHttpUrl = (u) => /^https?:\/\//i.test(String(u || ''));
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

const renderEmail = (brand, { heading, paragraphs = [], details = [], cta }) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
  <div style="background:${brand.color};color:#fff;padding:18px 24px;font-size:18px;font-weight:bold">${escapeHtml(brand.name)}</div>
  <div style="padding:24px;color:#333;line-height:1.6;font-size:15px">
    <h2 style="margin:0 0 14px;font-size:20px;color:#111">${escapeHtml(heading)}</h2>
    ${paragraphs.map((p) => `<p style="margin:0 0 12px">${escapeHtml(p)}</p>`).join('')}
    ${details.length ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:14px">${details
      .map(([k, v]) => `<tr><td style="padding:6px 0;color:#777;width:40%">${escapeHtml(k)}</td><td style="padding:6px 0;color:#111;font-weight:bold">${escapeHtml(v)}</td></tr>`)
      .join('')}</table>` : ''}
    ${cta ? `<p style="text-align:center;margin:20px 0 4px"><a href="${escapeHtml(cta.url)}" style="background:${brand.color};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>` : ''}
  </div>
  <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:12px;line-height:1.5">
    ${brand.supportEmail || brand.supportPhone
      ? `Need help? Contact us${brand.supportEmail ? ` at ${escapeHtml(brand.supportEmail)}` : ''}${brand.supportPhone ? ` or ${escapeHtml(brand.supportPhone)}` : ''}.`
      : 'Need help? Just reply to this email.'}<br>
    © ${new Date().getFullYear()} ${escapeHtml(brand.name)}
  </div>
</div>`;

// Har event ke liye { subject, heading, paragraphs, details, cta, sms } banata hai
const buildContent = (event, order, user, brand, extra) => {
  const no = order.orderNumber;
  const name = (user?.name || '').split(' ')[0] || 'there';
  const total = order.pricing?.total;
  const isCod = order.paymentMethod === 'cod';
  const paid = order.paymentStatus === 'paid';
  const orderLink = brand.siteUrl ? `${brand.siteUrl}/orders/${order._id}` : '';
  const view = orderLink ? { url: orderLink, label: 'View order' } : null;
  const hello = `Hi ${name},`;

  switch (event) {
    case 'shipped': {
      const t = order.tracking || {};
      const details = [];
      if (t.courier) details.push(['Courier', t.courier]);
      if (t.trackingNumber) details.push(['Tracking number', t.trackingNumber]);
      const paragraphs = [`${hello} good news: your order ${no} has been shipped and is on its way.`];
      if (isCod) paragraphs.push(`Please keep ${money(total)} ready to pay in cash when it arrives.`);
      const cta = isHttpUrl(t.trackingUrl) ? { url: t.trackingUrl, label: 'Track shipment' } : view;
      const via = [t.courier, t.trackingNumber].filter(Boolean).join(' ');
      return {
        subject: `Your order ${no} has shipped`,
        heading: 'Your order is on its way',
        paragraphs, details, cta,
        sms: `${brand.name}: Order ${no} has shipped${via ? ` (${via})` : ''}.${isCod ? ` Pay ${smsMoney(total)} on delivery.` : ''}${orderLink ? ` ${orderLink}` : ''}`,
      };
    }
    case 'delivered':
      return {
        subject: `Your order ${no} has been delivered`,
        heading: 'Delivered',
        paragraphs: [
          `${hello} your order ${no} has been delivered. We hope you love it!`,
          'If something is not right, please get in touch and we will sort it out.',
        ],
        cta: view,
        sms: `${brand.name}: Order ${no} has been delivered. Thank you for shopping with us!`,
      };
    case 'cancelled': {
      const reason = (extra.reason || '').trim();
      const paragraphs = [`${hello} your order ${no} has been cancelled${reason ? `: ${reason}` : '.'}`];
      paragraphs.push(paid
        ? `We will refund ${money(total)} to your original payment method and email you once it has been sent.`
        : 'You have not been charged for this order.');
      return {
        subject: `Your order ${no} has been cancelled`,
        heading: 'Order cancelled',
        paragraphs, cta: view,
        sms: `${brand.name}: Order ${no} has been cancelled.${paid ? ` Your refund of ${smsMoney(total)} is being processed.` : ''}`,
      };
    }
    case 'returned':
      return {
        subject: `Return recorded for order ${no}`,
        heading: 'Return recorded',
        paragraphs: [
          `${hello} we have recorded the return of order ${no}.`,
          paid ? `Your refund of ${money(total)} will be sent to you and we will email you once it is done.` : 'Thank you for letting us know.',
        ],
        cta: view,
        sms: null,
      };
    case 'refunded': {
      const ref = (extra.reference || '').trim();
      return {
        subject: `Refund processed for order ${no}`,
        heading: 'Your refund has been sent',
        paragraphs: [
          `${hello} we have refunded ${money(total)} for order ${no}.`,
          'Depending on your bank it can take a few working days to show in your account.',
        ],
        details: ref ? [['Refund reference', ref]] : [],
        cta: view,
        sms: `${brand.name}: Refund of ${smsMoney(total)} for order ${no} has been processed. It may take a few days to show in your account.`,
      };
    }
    // Order lag gaya / payment mil gaya. Email alag se jaati hai (order confirmation email),
    // isliye ye event sirf SMS hai (subject null = email nahi).
    case 'placed':
      return {
        subject: null,
        sms: isCod
          ? `${brand.name}: Order ${no} placed. Pay ${smsMoney(total)} on delivery.${orderLink ? ` ${orderLink}` : ''}`
          : `${brand.name}: Order ${no} confirmed, ${smsMoney(total)} paid.${orderLink ? ` ${orderLink}` : ''}`,
      };
    default:
      return null;
  }
};

export const notifyOrderEvent = async (event, order, extra = {}) => {
  const result = { event, email: 'skipped', sms: 'skipped' };
  try {
    const [user, brand] = await Promise.all([
      User.findById(order.userId).select('name email phone isPhoneVerified').lean(),
      getBrand(),
    ]);
    const content = buildContent(event, order, user, brand, extra);
    if (!content) return result;

    const jobs = [];

    // Email: nakli (phone-only account ka placeholder) address par kabhi nahi
    if (content.subject && user?.email && !isPlaceholderEmail(user.email)) {
      jobs.push(
        sendMail({ to: user.email, subject: `${content.subject} | ${brand.name}`, html: renderEmail(brand, content) })
          .then((r) => {
            result.email = r?.success ? 'sent' : 'failed';
            if (!r?.success) logger.warn(`Order ${event} email not delivered for ${order._id}: ${r?.error || 'unknown'}`);
          })
      );
    }

    // SMS: verified account number, nahi to checkout par diya delivery number
    const phone = [user?.isPhoneVerified ? user.phone : null, order.shippingAddress?.phone]
      .find((p) => p && INDIAN_MOBILE.test(String(p)));
    if (content.sms && phone) {
      jobs.push(
        sendSms({ to: phone, body: content.sms }).then((r) => {
          result.sms = r?.success ? 'sent' : 'failed';
          if (!r?.success) logger.warn(`Order ${event} SMS not delivered for ${order._id}: ${r?.error || 'unknown'}`);
        })
      );
    }

    await Promise.all(jobs);
  } catch (err) {
    logger.error(`Order ${event} notification failed for ${order?._id}: ${err.message}`);
  }
  return result;
};

// Controller se: response rokta nahi, kabhi reject nahi hota
export const notifyOrderEventInBackground = (event, order, extra) => {
  notifyOrderEvent(event, order, extra);
};
