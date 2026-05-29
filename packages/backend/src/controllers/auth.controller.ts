import { Request, Response } from 'express';
import { HTTP_STATUS } from '@urlshortener/shared';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

function sanitizeUser(user: { passwordHash?: string; [key: string]: any }) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { user, tokens } = await AuthService.register(req.body);

    setRefreshTokenCookie(res, tokens.refreshToken);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      message: 'Registration successful',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Registration failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Registration failed',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { user, tokens } = await AuthService.login(req.body);

    setRefreshTokenCookie(res, tokens.refreshToken);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      message: 'Login successful',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Login failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Login failed',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        data: null,
        message: 'Refresh token required',
        error: 'No refresh token provided',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { accessToken } = await AuthService.refreshToken(token);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { accessToken },
      message: 'Token refreshed successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Token refresh failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.UNAUTHORIZED;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Token refresh failed',
      error: error.message || 'Unable to refresh token',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const { oldPassword, newPassword } = req.body;

    await AuthService.changePassword(userId, oldPassword, newPassword);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: null,
      message: 'Password changed successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Change password failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to change password',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  try {
    clearRefreshTokenCookie(res);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: null,
      message: 'Logged out successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Logout failed', { error: error.message });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      data: null,
      message: 'Failed to logout',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
