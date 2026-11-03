import Joi from 'joi';

const phoneRule = Joi.string().pattern(/^[6-9]\d{9}$/).messages({
  'string.pattern.base': 'Please enter a valid 10-digit mobile number',
});

// Guest checkout: login ke bina order. Address saved nahi hota, order par snapshot banta hai.
const guestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required().messages({ 'any.required': 'Your name is required' }),
  phone: phoneRule.required().messages({ 'any.required': 'Phone number is required' }),
  email: Joi.string().trim().email().max(120).optional().allow('', null),
  phoneToken: Joi.string().max(1000).optional().allow('', null),
  address: Joi.object({
    addressLine1: Joi.string().trim().min(5).max(200).required(),
    addressLine2: Joi.string().trim().max(200).optional().allow('', null),
    city: Joi.string().trim().min(2).max(80).required(),
    state: Joi.string().trim().min(2).max(80).required(),
    pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).required().messages({
      'string.pattern.base': 'Please enter a valid 6-digit pincode',
    }),
  }).required(),
});

export const guestSendOtpSchema = Joi.object({
  phone: phoneRule.required(),
});

export const guestVerifyOtpSchema = Joi.object({
  phone: phoneRule.required(),
  otp: Joi.string().pattern(/^\d{6}$/).required().messages({ 'string.pattern.base': 'Enter the 6-digit OTP' }),
});

export const createOrderSchema = Joi.object({
  // Logged-in: addressId. Guest: guest object. Dono me se kaun hai, ye controller dekhta hai
  // (taaki expired-token wale user ko 400 nahi, 401 mile aur app token refresh kar le).
  addressId: Joi.string().optional(),
  guest: guestSchema.optional(),
  paymentMethod: Joi.string()
    .valid('razorpay', 'stripe', 'cod')
    .required()
    .messages({
      'any.only': 'Invalid payment method',
      'any.required': 'Payment method is required',
    }),
  couponCode: Joi.string().optional().allow('', null),
  notes: Joi.string().max(200).optional().allow('', null),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
    .required(),
  message: Joi.string().max(200).optional().allow(''),
  trackingNumber: Joi.string().max(60).optional().allow(''),
  courier: Joi.string().max(60).optional().allow(''),
  trackingUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(300).optional().allow('')
    .messages({ 'string.uri': 'Tracking link must be a valid http(s) URL' }),
});

export const refundOrderSchema = Joi.object({
  reference: Joi.string().max(100).optional().allow(''),
});
