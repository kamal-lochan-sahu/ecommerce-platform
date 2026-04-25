import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // ek user ka ek wishlist
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
}, { timestamps: true });



const Wishlist = mongoose.model('Wishlist', wishlistSchema);
export default Wishlist;