import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  storeName: {
    type: String,
    default: 'Luxora',
  },
  storeEmail: {
    type: String,
    default: '',
  },
  storePhone: {
    type: String,
    default: '',
  },
  storeAddress: {
    type: String,
    default: '',
  },
  currency: {
    type: String,
    default: 'INR',
  },
  deliveryFee: {
    type: Number,
    default: 49,
  },
  freeDeliveryAbove: {
    type: Number,
    default: 499,
  },
  taxRate: {
    type: Number,
    default: 18,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  // ─── White-label business details (Group 8) ───────────────────────────────
  // Invoice par seller ka legal naam / GSTIN, storefront par tagline / logo / social links.
  legalName: { type: String, default: '' },
  gstin: { type: String, default: '' },
  tagline: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  supportHours: { type: String, default: '' },
  // 0 = returns nahi (storefront par "Easy Returns" badge chhup jaata hai)
  returnWindowDays: { type: Number, default: 7, min: 0, max: 365 },
  invoicePrefix: { type: String, default: 'INV-' },
  instagramUrl: { type: String, default: '' },
  facebookUrl: { type: String, default: '' },
  xUrl: { type: String, default: '' },
  youtubeUrl: { type: String, default: '' },
  // Guest checkout (bina account ke order). White-label client band kar sakta hai.
  allowGuestCheckout: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Store ka ek hi settings document hota hai — singleton pattern.
// Pehli baar fetch hone par, agar doc exist nahi karta, to defaults se bana dete hain.
settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
