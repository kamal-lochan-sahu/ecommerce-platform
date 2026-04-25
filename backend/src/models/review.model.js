import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5,
  },
  title: String,
  comment: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters'],
  },
  images: [String],
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  },
  isApproved: {
    type: Boolean,
    default: true,
  },
  helpfulCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Ek user ek product ko sirf ek baar review kar sakta hai
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Product ratings update karo jab review add/update/delete ho
reviewSchema.statics.updateProductRating = async function (productId) {
  const result = await this.aggregate([
    { $match: { product: productId, isApproved: true } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const Product = mongoose.model('Product');
  if (result.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      'ratings.average': Math.round(result[0].averageRating * 10) / 10,
      'ratings.count': result[0].totalReviews,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      'ratings.average': 0,
      'ratings.count': 0,
    });
  }
};

const Review = mongoose.model('Review', reviewSchema);
export default Review;