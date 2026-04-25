import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
  },
  addressLine1: {
    type: String,
    required: [true, 'Address is required'],
  },
  addressLine2: String,
  city: {
    type: String,
    required: [true, 'City is required'],
  },
  state: {
    type: String,
    required: [true, 'State is required'],
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^[1-9][0-9]{5}$/, 'Please enter a valid pincode'],
  },
  country: {
    type: String,
    default: 'India',
  },
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Index for fast user address lookup
addressSchema.index({ userId: 1 });

const Address = mongoose.model('Address', addressSchema);
export default Address;