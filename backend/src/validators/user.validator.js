import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional().messages({
    'string.pattern.base': 'Please enter a valid Indian phone number',
  }),
});

export const changePasswordSchema = Joi.object({
  // Optional here: accounts created via phone-OTP have no password yet and
  // set their first one without an "old" password. The controller enforces
  // oldPassword whenever the account already has a password.
  oldPassword: Joi.string().optional().allow(''),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters',
    'any.required': 'New password is required',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm your password',
  }),
});

export const addAddressSchema = Joi.object({
  fullName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
    'string.pattern.base': 'Please enter a valid Indian phone number',
  }),
  addressLine1: Joi.string().min(5).max(100).required(),
  addressLine2: Joi.string().max(100).optional().allow(''),
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).required().messages({
    'string.pattern.base': 'Please enter a valid 6-digit pincode',
  }),
  country: Joi.string().default('India'),
  type: Joi.string().valid('home', 'work', 'other').default('home'),
  isDefault: Joi.boolean().default(false),
});

export const requestEmailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email',
    'any.required': 'Email is required',
  }),
});

export const verifyEmailSchema = Joi.object({
  otp: Joi.string().length(6).required().messages({
    'string.length': 'Code must be 6 digits',
    'any.required': 'Code is required',
  }),
});

export const requestPhoneSchema = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
    'string.pattern.base': 'Please enter a valid Indian phone number',
    'any.required': 'Phone is required',
  }),
});

export const verifyPhoneSchema = Joi.object({
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be 6 digits',
    'any.required': 'OTP is required',
  }),
});
