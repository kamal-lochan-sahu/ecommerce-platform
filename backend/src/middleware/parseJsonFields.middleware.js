import ApiError from '../utils/ApiError.js';

// multipart/form-data mein har value string hoti hai. Array/object fields
// (tags, specifications ...) client JSON.stringify karke bhejta hai; yahan unhe
// wapas asli array/object banate hain, taaki Joi aur controller ko sahi type mile.
//
// Order zaroori hai: upload (multer) -> parseJsonFields -> validate.
// Plain JSON request mein field pehle se array/object hota hai, to usse chhua nahi jaata.
export const parseJsonFields = (...fields) => (req, res, next) => {
  if (!req.body) return next();

  for (const field of fields) {
    const raw = req.body[field];
    if (typeof raw !== 'string') continue;

    // Khaali string = field bheja hi nahi gaya jaisa maano
    if (raw.trim() === '') {
      delete req.body[field];
      continue;
    }

    try {
      req.body[field] = JSON.parse(raw);
    } catch {
      throw new ApiError(400, `Invalid JSON in field "${field}"`);
    }
  }

  next();
};
