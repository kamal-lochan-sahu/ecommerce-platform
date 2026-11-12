// Store ki public settings (Admin -> Settings) se storefront ka text: currency, trust badges, tel link.
// Yahan koi client-specific number/claim hardcoded nahi: sab settings se aata hai.

const CACHE_KEY = 'store-settings-cache';

// Pichli baar ki settings browser mein rakhte hain, taaki dobara aane wale customer ko naam/logo turant dikhe
// (backend cold start mein 30 second tak lag sakte hain). Fresh settings aate hi replace ho jaati hain.
export const readCachedSettings = () => {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY));
    return v && typeof v === 'object' ? v : undefined;
  } catch {
    return undefined;
  }
};

export const writeCachedSettings = (settings) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(settings)); } catch { /* private mode etc. */ }
};

const SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
export const currencySymbol = (code) => SYMBOLS[code] || (code ? `${code} ` : '₹');
export const formatAmount = (n, currency = 'INR') =>
  `${currencySymbol(currency)}${Number(n || 0).toLocaleString('en-IN')}`;

// Settings abhi load nahi hui (na cache, na server) to false: tab koi number dikhana galat hoga.
export const settingsLoaded = (s) => !!s && s.freeDeliveryAbove !== undefined && s.deliveryFee !== undefined;

// Delivery fee 0 ho ya free-delivery threshold 0 ho to har order par delivery free hai.
export const deliveryAlwaysFree = (s) => Number(s.deliveryFee) === 0 || Number(s.freeDeliveryAbove) === 0;

// Trust badges (Home + product page). Sirf wahi claim dikhte hain jo settings se sach hain:
//  - delivery: free-delivery threshold settings se
//  - returns: returnWindowDays > 0 ho tabhi (0 = client returns nahi leta)
//  - support: tabhi jab client ne support hours/phone/email bhara ho (pehle "24/7 Support" hardcoded tha)
export const getTrustBadges = (s) => {
  if (!settingsLoaded(s)) return [];
  const badges = [
    {
      key: 'delivery',
      title: 'Free Delivery',
      sub: deliveryAlwaysFree(s) ? 'On all orders' : `Orders above ${formatAmount(s.freeDeliveryAbove, s.currency)}`,
    },
    { key: 'payment', title: 'Secure Payment', sub: '100% safe checkout' },
  ];
  if (Number(s.returnWindowDays) > 0) {
    badges.push({ key: 'returns', title: 'Easy Returns', sub: `${Number(s.returnWindowDays)}-day return policy` });
  }
  const support = s.supportHours || s.supportPhone || s.supportEmail;
  if (support) badges.push({ key: 'support', title: 'Customer Support', sub: support });
  return badges;
};

export const telHref = (phone = '') => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

// Content-Disposition header se file ka naam (server invoice number wala naam deta hai).
export const filenameFromDisposition = (header, fallback) => {
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header || '');
  const name = m ? decodeURIComponent(m[1]).trim() : '';
  return /^[\w.-]+\.pdf$/i.test(name) ? name : fallback;
};
