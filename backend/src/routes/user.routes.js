import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  requestEmailAdd,
  verifyEmailAdd,
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  requestEmailSchema,
  verifyEmailSchema,
} from '../validators/user.validator.js';
import { otpVerifyLimiter, otpResendLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Sab routes protected hain
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', upload.single('avatar'), validate(updateProfileSchema), updateProfile);
router.put('/change-password', validate(changePasswordSchema), changePassword);
router.post('/email/request', otpResendLimiter, validate(requestEmailSchema), requestEmailAdd);
router.post('/email/verify', otpVerifyLimiter, validate(verifyEmailSchema), verifyEmailAdd);
router.delete('/account', deleteAccount);

export default router;