import { Router } from 'express';
import { z } from 'zod';
import { validate, authenticate } from '../middleware';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

const querySchema = z.object({
  query: z.object({
    period: z.string().optional(),
    interval: z.enum(['hourly', 'daily', 'monthly']).optional(),
    format: z.enum(['json', 'csv']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    country: z.string().optional(),
    deviceType: z.string().optional(),
    browser: z.string().optional(),
  }),
});

router.get('/dashboard', authenticate, validate(querySchema), analyticsController.getDashboardStats);
router.get('/links/:linkId/clicks', authenticate, validate(querySchema), analyticsController.getClickAnalytics);
router.get('/links/:linkId/geo', authenticate, validate(querySchema), analyticsController.getGeographicData);
router.get('/links/:linkId/devices', authenticate, validate(querySchema), analyticsController.getDeviceAnalytics);
router.get('/links/:linkId/timeline', authenticate, validate(querySchema), analyticsController.getClicksOverTime);
router.get('/links/:linkId/referrers', authenticate, validate(querySchema), analyticsController.getReferrerData);
router.get('/realtime', authenticate, validate(querySchema), analyticsController.getRealTimeStats);
router.get('/links/:linkId/export', authenticate, validate(querySchema), analyticsController.exportAnalytics);

export default router;
