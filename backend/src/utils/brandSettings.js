import ApiError from './ApiError.js';

// White-label store ke "business" fields (naam ke alawa): legal naam, GSTIN, tagline, logo,
// support timing, return window, invoice prefix, social links.
// Ek hi jagah: validation (Admin -> Settings save), public view (storefront), invoice number.

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const INVOICE_PREFIX_RE = /^[A-Za-z0-9\-_/]{0,10}$/;

const TEXT_FIELDS = { legalName: 120, tagline: 120, supportHours: 80 };
const URL_FIELDS = { logoUrl: 500, instagramUrl: 300, facebookUrl: 300, xUrl: 300, youtubeUrl: 300 };

export const BRAND_SETTINGS_FIELDS = [
  'legalName', 'gstin', 'tagline', 'logoUrl', 'supportHours', 'returnWindowDays', 'invoicePrefix',
  'instagramUrl', 'facebookUrl', 'xUrl', 'youtubeUrl',
];

const isHttpsUrl = (v) => {
  try { return new URL(v).protocol === 'https:'; } catch { return false; }
};

// `updates` mein sirf wahi keys check hoti hain jo bheji gayi hain. Galat value par 400.
export const validateBrandSettings = (updates) => {
  for (const [key, max] of Object.entries(TEXT_FIELDS)) {
    if (updates[key] !== undefined) updates[key] = String(updates[key]).trim().slice(0, max);
  }

  if (updates.gstin !== undefined) {
    updates.gstin = String(updates.gstin).trim().toUpperCase();
    if (updates.gstin && !GSTIN_RE.test(updates.gstin)) {
      throw new ApiError(400, 'GSTIN must be 15 characters like 22AAAAA0000A1Z5');
    }
  }

  for (const [key, max] of Object.entries(URL_FIELDS)) {
    if (updates[key] === undefined) continue;
    const v = String(updates[key]).trim();
    if (v && (v.length > max || !isHttpsUrl(v))) {
      throw new ApiError(400, `${key} must be a full https:// link`);
    }
    updates[key] = v;
  }

  if (updates.returnWindowDays !== undefined) {
    const raw = updates.returnWindowDays;
    const n = Number(raw);
    if (String(raw).trim() === '' || !Number.isInteger(n) || n < 0 || n > 365) {
      throw new ApiError(400, 'returnWindowDays must be a whole number between 0 and 365');
    }
    updates.returnWindowDays = n;
  }

  if (updates.invoicePrefix !== undefined) {
    updates.invoicePrefix = String(updates.invoicePrefix).trim();
    if (!INVOICE_PREFIX_RE.test(updates.invoicePrefix)) {
      throw new ApiError(400, 'Invoice prefix can have up to 10 letters, numbers, - _ or /');
    }
  }
  return updates;
};

// GET /api/settings/public ka jawab. Sirf wahi jo storefront ko dikhana hai.
export const buildPublicSettings = (s = {}) => ({
  taxRate: s.taxRate,
  deliveryFee: s.deliveryFee,
  freeDeliveryAbove: s.freeDeliveryAbove,
  currency: s.currency,
  storeName: s.storeName,
  // Storefront ye dekhkar "store maintenance mein hai" banner dikhata hai
  maintenanceMode: !!s.maintenanceMode,
  // Checkout page guest form dikhaye ya login maange
  allowGuestCheckout: s.allowGuestCheckout !== false,
  legalName: s.legalName || '',
  gstin: s.gstin || '',
  tagline: s.tagline || '',
  logoUrl: s.logoUrl || '',
  supportEmail: s.storeEmail || '',
  supportPhone: s.storePhone || '',
  supportHours: s.supportHours || '',
  storeAddress: s.storeAddress || '',
  returnWindowDays: s.returnWindowDays ?? 7,
  socialLinks: {
    instagram: s.instagramUrl || '',
    facebook: s.facebookUrl || '',
    x: s.xUrl || '',
    youtube: s.youtubeUrl || '',
  },
});

// Invoice number ka EK hi formula yahan hai. GST kanoon invoice ki consecutive series maangta hai;
// abhi order number se banta hai (INV-63569874-938). CA ka faisla aaye to sirf yeh function badlo.
export const formatInvoiceNumber = (order, prefix = 'INV-') => {
  const base = order?.orderNumber
    ? String(order.orderNumber).replace(/^ORD-/i, '')
    : String(order?._id || '').slice(-8).toUpperCase();
  return `${prefix}${base}`;
};
