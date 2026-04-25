import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).required(),
  shortDescription: Joi.string().max(300).optional().allow(''),
  category: Joi.string().required(),
  brand: Joi.string().optional().allow(''),
  price: Joi.number().min(0).required(),
  comparePrice: Joi.number().min(0).optional(),
  costPrice: Joi.number().min(0).optional(),
  stock: Joi.number().min(0).default(0),
  lowStockThreshold: Joi.number().min(0).default(10),
  sku: Joi.string().optional().allow(''),
  hasVariants: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string()).optional(),
  specifications: Joi.array().items(
    Joi.object({ key: Joi.string(), value: Joi.string() })
  ).optional(),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  weight: Joi.number().optional(),
  dimensions: Joi.object({
    length: Joi.number(),
    width: Joi.number(),
    height: Joi.number(),
  }).optional(),
  meta: Joi.object({
    title: Joi.string(),
    description: Joi.string(),
  }).optional(),
});

export const updateProductSchema = createProductSchema.fork(
  ['name', 'description', 'category', 'price'],
  (schema) => schema.optional()
);