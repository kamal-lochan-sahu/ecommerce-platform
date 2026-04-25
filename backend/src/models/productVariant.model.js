import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true, // e.g., "Red / XL"
  },
  options: [
    {
      name: String,  // e.g., "Color"
      value: String, // e.g., "Red"
    },
  ],
  price: {
    type: Number,
    required: true,
  },
  comparePrice: Number,
  stock: {
    type: Number,
    default: 0,
  },
  sku: String,
  images: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

productVariantSchema.index({ productId: 1 });

const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);
export default ProductVariant;