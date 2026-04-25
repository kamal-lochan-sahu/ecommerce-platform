import mongoose from 'mongoose';

const addressSnapshotSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  addressLine1: String,
  addressLine2: String,
  city: String,
  state: String,
  pincode: String,
  country: String,
}, { _id: false }); // _id nahi chahiye nested schema mein

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      variant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductVariant',
        default: null,
      },
      // PRICE SNAPSHOT
      name: String,
      image: String,
      price: Number,
      quantity: Number,
      total: Number,
    },
  ],
  // ADDRESS SNAPSHOT
  shippingAddress: addressSnapshotSchema,

  pricing: {
    subtotal: Number,
    shippingCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: Number,
  },

  couponCode: String,

  paymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'cod'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },

  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'placed',
  },

  statusHistory: [
    {
      status: String,
      message: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],

  tracking: {
    courier: String,
    trackingNumber: String,
    trackingUrl: String,
  },

  notes: String,
  cancelReason: String,
  deliveredAt: Date,
  expectedDelivery: Date,
}, { timestamps: true });

// Auto-generate order number before save
orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
});

orderSchema.index({ userId: 1, createdAt: -1 });

orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;