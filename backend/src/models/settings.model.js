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
