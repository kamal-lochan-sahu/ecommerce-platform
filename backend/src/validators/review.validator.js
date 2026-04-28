import Joi from 'joi';

export const createReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required().messages({
    'any.required': 'Rating is required',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
  }),
  title: Joi.string().max(100).optional().allow('', null),
  comment: Joi.string().max(500).optional().allow('', null),
  orderId: Joi.string().optional().allow('', null),
});

export const updateReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).optional(),
  title: Joi.string().max(100).optional().allow('', null),
  comment: Joi.string().max(500).optional().allow('', null),
});