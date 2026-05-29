import { Router } from 'express';
import { z } from 'zod';
import { validate, authenticate, apiLimiter } from '../middleware';
import * as linkController from '../controllers/link.controller';

const router = Router();

const createLinkSchema = z.object({
  body: z.object({
    originalUrl: z.string().url('Invalid URL must be a valid URL'),
    customAlias: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{4,20}$/, 'Custom alias must be 4-20 alphanumeric characters, hyphens, or underscores')
      .optional(),
    title: z.string().max(255).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    expiresAt: z.string().datetime().optional(),
    password: z.string().min(4).optional(),
  }),
});

const updateLinkSchema = z.object({
  body: z.object({
    originalUrl: z.string().url('Invalid URL').optional(),
    title: z.string().max(255).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    password: z.string().min(4).nullable().optional(),
  }),
});

const getUserLinksQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    tag: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

router.post('/', authenticate, apiLimiter, validate(createLinkSchema), linkController.createLink);
router.get('/', authenticate, validate(getUserLinksQuerySchema), linkController.getUserLinks);
router.get('/:id', authenticate, linkController.getLink);
router.patch('/:id', authenticate, validate(updateLinkSchema), linkController.updateLink);
router.delete('/:id', authenticate, linkController.deleteLink);
router.get('/:id/analytics', authenticate, linkController.getLinkAnalytics);
router.get('/:id/qr', authenticate, linkController.getQRCode);
router.post('/:id/qr', authenticate, linkController.generateQRCode);

export default router;
