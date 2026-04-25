import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(200).optional().allow(''),
  image: Joi.string().optional().allow(''),
  parent: Joi.string().optional().allow(null, ''),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(200).optional().allow(''),
  image: Joi.string().optional().allow(''),
  parent: Joi.string().optional().allow(null, ''),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().optional(),
});