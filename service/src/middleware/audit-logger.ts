import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * Extract the real client IP address from request headers
 * Checks Cloudflare, proxy headers, and falls back to req.ip
 */
const getClientIp = (req: Request): string | null => {
  // 1. Check Cloudflare's CF-Connecting-IP header (most reliable for Cloudflare)
  const cfIp = req.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  // 2. Check X-Forwarded-For (standard proxy header)
  // This can be a comma-separated list; the first IP is the original client
  const forwardedFor = req.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips[0]) {
      return ips[0];
    }
  }

  // 3. Check X-Real-IP (nginx header)
  const realIp = req.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // 4. Fall back to Express's req.ip (requires trust proxy setting)
  if (req.ip) {
    return req.ip;
  }

  // 5. Last resort: socket remote address
  return req.socket.remoteAddress || null;
};

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
        const ipAddress = getClientIp(req);
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
