import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  phone: {
    type: String,
    unique: true,
    sparse: true, // null values pe unique apply nahi hoga
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number'],
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // password query mein automatically nahi aayega
  },
  avatar: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'vendor'],
    default: 'customer',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  googleId: {
    type: String,
    sparse: true,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
  refreshToken: {
    type: String,
    select: false,
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
  },
  lastLogin: Date,
}, { timestamps: true });

// Password hash — save se pehle
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Password compare method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Password field response mein nahi aayega
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.otp;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;