import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/user.validator.js';

const router = Router();

// Sab routes protected hain
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', upload.single('avatar'), validate(updateProfileSchema), updateProfile);
router.put('/change-password', validate(changePasswordSchema), changePassword);
router.delete('/account', deleteAccount);

export default router;