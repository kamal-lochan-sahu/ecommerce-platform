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
    min: 0,
  },
  comparePrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  sku: String,
  images: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

productVariantSchema.index({ productId: 1 });
// SKU unique (jin variants ka SKU nahi hai unhe sparse index ignore karta hai)
productVariantSchema.index({ sku: 1 }, { unique: true, sparse: true });

const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);
export default ProductVariant;