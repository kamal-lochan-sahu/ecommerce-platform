import Joi from 'joi';

const optionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(30).required(),   // e.g. "Color"
  value: Joi.string().trim().min(1).max(50).required(),  // e.g. "Red"
});

// NOTE: validate middleware sirf check karta hai, defaults apply nahi karta —
// stock=0 / isActive=true ke defaults controller mein lagte hain.
const base = {
  name: Joi.string().trim().max(120).optional().allow(''),
  options: Joi.array()
    .items(optionSchema)
    .min(1)
    .max(3)
    .unique((a, b) => a.name.trim().toLowerCase() === b.name.trim().toLowerCase())
    .messages({ 'array.unique': 'Each option name (Color, Size...) can be used only once per variant' }),
  price: Joi.number().min(0),
  comparePrice: Joi.number().min(0).allow(null),
  stock: Joi.number().integer().min(0),
  sku: Joi.string().trim().max(60).allow('', null),
  images: Joi.array().items(Joi.string()).max(10),
  isActive: Joi.boolean(),
};

export const createVariantSchema = Joi.object(base).fork(['options', 'price'], (s) => s.required());

export const updateVariantSchema = Joi.object(base).min(1);
