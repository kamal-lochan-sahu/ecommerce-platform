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
    .valid('confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    .required(),
  message: Joi.string().optional().allow(''),
  trackingNumber: Joi.string().optional().allow(''),
  courier: Joi.string().optional().allow(''),
  trackingUrl: Joi.string().optional().allow(''),
});