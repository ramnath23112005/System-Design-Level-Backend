import { Router } from 'express';
import authRoutes from './auth.routes';
import linkRoutes from './link.routes';
import analyticsRoutes from './analytics.routes';
import adminRoutes from './admin.routes';
import userRoutes from './user.routes';
import qrCodeRoutes from './qr.routes';
import redirectRoutes from './redirect.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/links', linkRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/qr', qrCodeRoutes);
router.use('/', redirectRoutes);

export default router;
