import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  gateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'cod'],
    required: true,
  },
  gatewayOrderId: String,   // Razorpay/Stripe order ID
  gatewayPaymentId: String, // Razorpay/Stripe payment ID
  gatewaySignature: String, // Razorpay signature
  status: {
    type: String,
    enum: ['initiated', 'success', 'failed', 'refunded'],
    default: 'initiated',
  },
  refundId: String,
  refundAmount: Number,
  refundedAt: Date,
  metadata: mongoose.Schema.Types.Mixed, // extra gateway data
}, { timestamps: true });

transactionSchema.index({ order: 1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ gatewayPaymentId: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;