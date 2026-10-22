import Joi from 'joi';

export const createOrderSchema = Joi.object({
  addressId: Joi.string().required().messages({
    'any.required': 'Delivery address is required',
  }),
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
