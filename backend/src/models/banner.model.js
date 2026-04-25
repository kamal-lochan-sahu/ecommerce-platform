import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  subtitle: String,
  image: {
    type: String,
    required: true,
  },
  mobileImage: String, // alag mobile banner
  link: String,        // click pe kahan jaaye
  type: {
    type: String,
    enum: ['hero', 'promotional', 'category', 'popup'],
    default: 'hero',
  },
  position: {
    type: String,
    enum: ['home_top', 'home_middle', 'sidebar', 'popup'],
    default: 'home_top',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  startsAt: Date,
  endsAt: Date,
}, { timestamps: true });

bannerSchema.index({ type: 1, isActive: 1 });

const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;