import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '@urlshortener/shared';

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        data: null,
        message: 'Authentication required',
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        data: null,
        message: 'Insufficient permissions',
        error: 'Access forbidden',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
