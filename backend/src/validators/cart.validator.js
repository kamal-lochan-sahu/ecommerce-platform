import Joi from 'joi';

export const addToCartSchema = Joi.object({
  productId: Joi.string().required().messages({
    'any.required': 'Product ID is required',
  }),
  variantId: Joi.string().optional().allow(null, ''),
  quantity: Joi.number().min(1).max(100).default(1).messages({
    'number.min': 'Quantity must be at least 1',
    'number.max': 'Maximum 100 items allowed',
  }),
});

export const updateCartSchema = Joi.object({
  productId: Joi.string().required(),
  variantId: Joi.string().optional().allow(null, ''),
  quantity: Joi.number().min(1).max(100).required().messages({
    'number.min': 'Quantity must be at least 1',
  }),
});

export const removeFromCartSchema = Joi.object({
  productId: Joi.string().required(),
  variantId: Joi.string().optional().allow(null, ''),
});