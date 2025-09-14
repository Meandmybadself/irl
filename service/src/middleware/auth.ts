import { Request, Response, NextFunction } from 'express';
import { createError } from './error-handler.js';

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      isSystemAdmin: boolean;
      deleted: boolean;
    }
  }
}

// Middleware to ensure user is authenticated
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  // For testing, allow bypassing auth with test header
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-user']) {
    try {
      req.user = JSON.parse(req.headers['x-test-user'] as string);
    } catch {
      // If parsing fails, continue with normal auth
    }
  }
  
  if (!req.user) {
    throw createError(401, 'Authentication required');
  }
  
  // Check if user account is deleted
  if (req.user.deleted) {
    throw createError(401, 'Account no longer active');
  }
  
  next();
};

// Middleware to ensure user is a system admin
export const requireSystemAdmin = (req: Request, _res: Response, next: NextFunction) => {
  // For testing, allow bypassing auth with test header
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-user']) {
    try {
      req.user = JSON.parse(req.headers['x-test-user'] as string);
    } catch {
      // If parsing fails, continue with normal auth
    }
  }
  
  if (!req.user) {
    throw createError(401, 'Authentication required');
  }
  
  // Check if user account is deleted
  if (req.user.deleted) {
    throw createError(401, 'Account no longer active');
  }
  
  if (!req.user.isSystemAdmin) {
    throw createError(403, 'System administrator access required');
  }
  
  next();
};