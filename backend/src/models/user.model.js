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
  // NOT unique by itself: anyone can type any number into a form, so an unverified
  // number proves nothing and must never block (or capture) the real owner. Only a
  // VERIFIED number is unique - see the partial index below.
  phone: {
    type: String,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number'],
  },
  isPhoneVerified: { type: Boolean, default: false },
  phoneVerifiedAt: Date,
  deletedAt: Date, // set when the customer deletes their own account
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
// One VERIFIED owner per phone number. Unverified duplicates are allowed.
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { isPhoneVerified: true }, name: 'phone_verified_unique' }
);

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