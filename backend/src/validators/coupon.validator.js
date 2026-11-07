import Joi from 'joi';

// Scope list: Mongo ObjectId strings, duplicates nahi
const objectIdList = Joi.array()
  .items(Joi.string().hex().length(24).messages({
    'string.hex': 'Invalid id in the list',
    'string.length': 'Invalid id in the list',
  }))
  .unique();

export const createCouponSchema = Joi.object({
  code: Joi.string().min(3).max(20).required().messages({
    'any.required': 'Coupon code is required',
  }),
  description: Joi.string().max(200).optional().allow('', null),
  type: Joi.string().valid('percentage', 'fixed').required().messages({
    'any.required': 'Coupon type is required',
    'any.only': 'Type must be percentage or fixed',
  }),
  // Percentage coupon 100% se zyada nahi ho sakta (warna order total negative ho jaata)
  value: Joi.number().min(1).required()
    .when('type', {
      is: 'percentage',
      then: Joi.number().max(100).messages({
        'number.max': 'Percentage discount cannot be more than 100',
      }),
    })
    .messages({
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
  applicableProducts: objectIdList.optional(),
  applicableCategories: objectIdList.optional(),
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
  // Khaali array = scope hata do (poore cart par lagega)
  applicableProducts: objectIdList.optional(),
  applicableCategories: objectIdList.optional(),
});

export const applyCouponSchema = Joi.object({
  code: Joi.string().required().messages({
    'any.required': 'Coupon code is required',
  }),
});