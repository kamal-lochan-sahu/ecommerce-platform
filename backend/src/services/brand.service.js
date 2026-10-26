import { Settings } from '../models/index.js';

// White-label: har client ka naam / support contact alag hota hai.
// Source of truth = Admin -> Settings (database), taaki client khud badal sake, deploy ke bina.
// Env sirf fallback hai (pehli baar setup, ya DB na mile tab).
//
//   naam          : Settings.storeName   -> CLIENT_NAME   -> "Luxora"
//   support email : Settings.storeEmail  -> SUPPORT_EMAIL -> ""  (nakli default kabhi nahi)
//   support phone : Settings.storePhone  -> SUPPORT_PHONE -> ""
export const getBrand = async () => {
  let settings = null;
  try {
    settings = await Settings.getSingleton();
  } catch {
    // DB hiccup par bhi email/SMS jaana chahiye, env se kaam chalao
  }
  const color = (process.env.BRAND_COLOR || '').trim();
  return {
    name: (settings?.storeName || process.env.CLIENT_NAME || 'Luxora').trim(),
    supportEmail: (settings?.storeEmail || process.env.SUPPORT_EMAIL || '').trim(),
    supportPhone: (settings?.storePhone || process.env.SUPPORT_PHONE || '').trim(),
    address: (settings?.storeAddress || '').trim(),
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#4f46e5',
    siteUrl: (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, ''),
  };
};
