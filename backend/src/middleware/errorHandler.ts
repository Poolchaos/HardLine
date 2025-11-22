import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with redacted request info (no sensitive data)
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    correlationId: req.headers['x-correlation-id'] || 'unknown',
  });

  // Don't expose stack traces in production
  const isDev = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: 'Internal Server Error',
    message: isDev ? err.message : 'Something went wrong',
    ...(isDev && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
