import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HTTP_STATUS } from '@urlshortener/shared';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const fullResult = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (fullResult.success) {
      if (fullResult.data.body !== undefined) req.body = fullResult.data.body;
      if (fullResult.data.query !== undefined) req.query = fullResult.data.query;
      if (fullResult.data.params !== undefined) req.params = fullResult.data.params;
      next();
      return;
    }

    const bodyResult = schema.safeParse(req.body);
    if (bodyResult.success) {
      req.body = bodyResult.data;
      next();
      return;
    }

    const errors = fullResult.error.errors.length >= bodyResult.error.errors.length
      ? fullResult.error.errors
      : bodyResult.error.errors;

    const formatted = errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));

    res.status(HTTP_STATUS.UNPROCESSABLE).json({
      success: false,
      data: null,
      message: 'Validation failed',
      error: formatted,
      timestamp: new Date().toISOString(),
    });
  };
}
