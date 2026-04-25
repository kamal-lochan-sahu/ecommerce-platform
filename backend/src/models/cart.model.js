import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVariant',
    default: null,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  price: Number, // snapshot at time of adding
}, { _id: true });

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  sessionId: {
    type: String,
    default: null, // guest cart ke liye
  },
  items: [cartItemSchema],
  couponCode: String,
  couponDiscount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true, toJSON: { virtuals: true } });

// Virtual — total amount
cartSchema.virtual('totalAmount').get(function () {
  return this.items.reduce((total, item) => total + item.price * item.quantity, 0);
});

// Virtual — total items count
cartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

cartSchema.index({ userId: 1 });
cartSchema.index({ sessionId: 1 });

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;