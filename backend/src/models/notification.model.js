import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['order', 'payment', 'offer', 'system', 'loyalty'],
    default: 'system',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  link: String, // click pe kahan jaaye
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;