import Joi from 'joi';

export const createBannerSchema = Joi.object({
  title: Joi.string().max(100).required().messages({
    'any.required': 'Title is required',
  }),
  subtitle: Joi.string().max(200).optional().allow('', null),
  link: Joi.string().uri().optional().allow('', null),
  type: Joi.string().valid('hero', 'promotional', 'category', 'popup').default('hero'),
  position: Joi.string().valid('home_top', 'home_middle', 'sidebar', 'popup').default('home_top'),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0),
  startsAt: Joi.date().optional().allow(null),
  endsAt: Joi.date().optional().allow(null),
}).options({ allowUnknown: true });

export const updateBannerSchema = Joi.object({
  title: Joi.string().max(100).optional(),
  subtitle: Joi.string().max(200).optional().allow('', null),
  link: Joi.string().uri().optional().allow('', null),
  type: Joi.string().valid('hero', 'promotional', 'category', 'popup').optional(),
  position: Joi.string().valid('home_top', 'home_middle', 'sidebar', 'popup').optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  startsAt: Joi.date().optional().allow(null),
  endsAt: Joi.date().optional().allow(null),
}).options({ allowUnknown: true });