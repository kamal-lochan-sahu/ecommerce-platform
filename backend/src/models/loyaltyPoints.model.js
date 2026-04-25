import mongoose from 'mongoose';

const loyaltySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  lifetimePoints: {
    type: Number,
    default: 0, // kabhi kam nahi hoga — total earned
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ['earned', 'redeemed', 'expired', 'bonus'],
      },
      points: Number,
      description: String,
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
      },
      expiresAt: Date,
      createdAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });



const LoyaltyPoints = mongoose.model('LoyaltyPoints', loyaltySchema);
export default LoyaltyPoints;