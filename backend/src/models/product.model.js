import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Name too long'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  shortDescription: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null = single seller mode
  },
  brand: String,
  images: [String], // Cloudinary URLs
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  comparePrice: {
    type: Number,
    default: 0, // Original MRP — discount calculate karne ke liye
  },
  costPrice: {
    type: Number,
    default: 0, // Internal — profit calculate karne ke liye
    select: false,
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
  },
  hasVariants: {
    type: Boolean,
    default: false,
  },
  tags: [String],
  specifications: [
    {
      key: String,
      value: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
  totalSold: {
    type: Number,
    default: 0,
  },
  weight: Number, // grams mein
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
  meta: {
    title: String,
    description: String,
  },
}, { timestamps: true, toJSON: { virtuals: true } });

// Virtual — discount percentage
productSchema.virtual('discountPercent').get(function () {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

// Virtual — stock status
productSchema.virtual('stockStatus').get(function () {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

// Indexes

productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' }); // full-text search

const Product = mongoose.model('Product', productSchema);
export default Product;