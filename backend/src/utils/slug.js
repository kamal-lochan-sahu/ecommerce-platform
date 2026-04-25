import slugify from 'slugify';
import { Product } from '../models/index.js';
import { Category } from '../models/index.js';

export const generateSlug = (text) => {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
};

// Unique slug — agar exist kare toh -1, -2 add karo
export const generateUniqueProductSlug = async (name, excludeId = null) => {
  let slug = generateSlug(name);
  let exists = await Product.findOne({
    slug,
    ...(excludeId && { _id: { $ne: excludeId } }),
  });

  let counter = 1;
  while (exists) {
    slug = `${generateSlug(name)}-${counter}`;
    exists = await Product.findOne({
      slug,
      ...(excludeId && { _id: { $ne: excludeId } }),
    });
    counter++;
  }
  return slug;
};

export const generateUniqueCategorySlug = async (name, excludeId = null) => {
  let slug = generateSlug(name);
  let exists = await Category.findOne({
    slug,
    ...(excludeId && { _id: { $ne: excludeId } }),
  });

  let counter = 1;
  while (exists) {
    slug = `${generateSlug(name)}-${counter}`;
    exists = await Category.findOne({
      slug,
      ...(excludeId && { _id: { $ne: excludeId } }),
    });
    counter++;
  }
  return slug;
};