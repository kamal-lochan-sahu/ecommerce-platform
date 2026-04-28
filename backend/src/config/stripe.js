import Stripe from 'stripe';

let stripeInstance = null;

export const getStripe = () => {
  if (!stripeInstance && process.env.STRIPE_ENABLED === 'true') {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    console.log('✅ Stripe Initialized');
  }
  return stripeInstance;
};