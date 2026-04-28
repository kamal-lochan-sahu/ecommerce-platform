import Joi from 'joi';

export const createCouponSchema = Joi.object({
  code: Joi.string().min(3).max(20).required().messages({
    'any.required': 'Coupon code is required',
  }),
  description: Joi.string().max(200).optional().allow('', null),
  type: Joi.string().valid('percentage', 'fixed').required().messages({
    'any.required': 'Coupon type is required',
    'any.only': 'Type must be percentage or fixed',
  }),
  value: Joi.number().min(1).required().messages({
    'any.required': 'Discount value is required',
  }),
  minOrderAmount: Joi.number().min(0).default(0),
  maxDiscount: Joi.number().min(0).optional().allow(null),
  usageLimit: Joi.number().min(1).optional().allow(null),
  usagePerUser: Joi.number().min(1).default(1),
  isActive: Joi.boolean().default(true),
  expiresAt: Joi.date().greater('now').required().messages({
    'any.required': 'Expiry date is required',
    'date.greater': 'Expiry date must be in future',
  }),
  startsAt: Joi.date().optional(),
  applicableProducts: Joi.array().items(Joi.string()).optional(),
  applicableCategories: Joi.array().items(Joi.string()).optional(),
});

export const updateCouponSchema = Joi.object({
  description: Joi.string().max(200).optional().allow('', null),
  value: Joi.number().min(1).optional(),
  minOrderAmount: Joi.number().min(0).optional(),
  maxDiscount: Joi.number().min(0).optional().allow(null),
  usageLimit: Joi.number().min(1).optional().allow(null),
  usagePerUser: Joi.number().min(1).optional(),
  isActive: Joi.boolean().optional(),
  expiresAt: Joi.date().greater('now').optional(),
});

export const applyCouponSchema = Joi.object({
  code: Joi.string().required().messages({
    'any.required': 'Coupon code is required',
  }),
});