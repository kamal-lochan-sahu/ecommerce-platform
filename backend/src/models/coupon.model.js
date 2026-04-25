import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrderAmount: {
    type: Number,
    default: 0,
  },
  maxDiscount: {
    type: Number,
    default: null, // null = no cap on discount
  },
  usageLimit: {
    type: Number,
    default: null, // null = unlimited
  },
  usagePerUser: {
    type: Number,
    default: 1,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  usedBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      usedAt: { type: Date, default: Date.now },
    },
  ],
  applicableProducts: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  ],
  applicableCategories: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  startsAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });


couponSchema.index({ expiresAt: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;