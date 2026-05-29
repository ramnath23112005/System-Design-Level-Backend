import { Router } from 'express';
import { z } from 'zod';
import { validate, authenticate, authorize } from '../middleware';
import { ROLES } from '@urlshortener/shared';
import * as adminController from '../controllers/admin.controller';

const router = Router();

const manageUserSchema = z.object({
  body: z.object({
    action: z.enum(['activate', 'deactivate']),
  }),
});

const getLogsQuerySchema = z.object({
  query: z.object({
    level: z.string().optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
  }),
});

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/stats', adminController.getSystemStats);
router.get('/activity', adminController.getRecentActivity);
router.get('/users', adminController.getUsers);
router.patch('/users/:userId', validate(manageUserSchema), adminController.manageUser);
router.get('/health', adminController.getSystemHealth);
router.get('/logs', validate(getLogsQuerySchema), adminController.getLogs);

export default router;
