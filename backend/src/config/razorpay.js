import Razorpay from 'razorpay';

let razorpayInstance = null;

export const getRazorpay = () => {
  if (!razorpayInstance && process.env.RAZORPAY_ENABLED === 'true') {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay Initialized');
  }
  return razorpayInstance;
};