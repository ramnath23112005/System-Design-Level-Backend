import { Router } from 'express';
import { z } from 'zod';
import { validate, authenticate } from '../middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email('Invalid email format').optional(),
  }),
});

router.get('/profile', authenticate, userController.getProfile);
router.patch('/profile', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.post('/api-key/regenerate', authenticate, userController.regenerateApiKey);

export default router;
