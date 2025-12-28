import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * Audit logging middleware
 * Logs all API requests (except /api/auth routes) to the audit_logs table
 */
export const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  // Skip logging for auth routes
  if (req.path.startsWith('/api/auth')) {
    return next();
  }

  // Store the original res.json to intercept the response
  const originalJson = res.json.bind(res);

  // Override res.json to capture status code
  res.json = function (body: any) {
    // Log the audit entry asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const userId = (req.user as any)?.id || null;
        const method = req.method;
        const path = req.path;
        const statusCode = res.statusCode;
        const ipAddress = req.ip || req.socket.remoteAddress || null;
        const userAgent = req.get('user-agent') || null;

        await prisma.auditLog.create({
          data: {
            userId,
            method,
            path,
            statusCode,
            ipAddress,
            userAgent
          }
        });
      } catch (error) {
        // Silently fail - don't break the application if audit logging fails
        console.error('Audit logging failed:', error);
      }
    });

    // Call original json method to send response
    return originalJson(body);
  };

  next();
};
