import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { ZodError } from 'zod'

export interface ApiError extends Error {
  statusCode: number;
}

export const createError = (statusCode: number, message: string): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  return error;
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', error)

  const prismaErrorCode = getPrismaErrorCode(error)

  // Prisma errors
  if (prismaErrorCode === 'P2002') {
    res.status(409).json({
      success: false,
      error: 'Resource already exists with this unique field',
      message: 'Unique constraint violation',
    })
    return
  }

  if (prismaErrorCode === 'P2025') {
    res.status(404).json({
      success: false,
      error: 'Resource not found',
      message: 'Record to update not found',
    })
    return
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
    })
    return
  }

  // Custom API errors
  if ((error as ApiError).statusCode) {
    res.status((error as ApiError).statusCode).json({
      success: false,
      error: error.message,
      message: error.message,
    })
    return
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'Something went wrong',
  })
}

const getPrismaErrorCode = (err: unknown): string | null => {
  if (err instanceof PrismaClientKnownRequestError) {
    return err.code
  }

  if (!err || typeof err !== 'object') {
    return null
  }

  const candidate = err as { code?: unknown }
  return typeof candidate.code === 'string' ? candidate.code : null
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
