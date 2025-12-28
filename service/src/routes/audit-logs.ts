import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSystemAdmin } from '../middleware/authorization.js';
import type { PaginatedResponse, AuditLog } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format audit log response
const formatAuditLog = (log: any): AuditLog => {
  return {
    id: log.id,
    userId: log.userId,
    method: log.method,
    path: log.path,
    statusCode: log.statusCode,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
    user: log.user ? {
      id: log.user.id,
      email: log.user.email,
      isSystemAdmin: log.user.isSystemAdmin,
      createdAt: log.user.createdAt.toISOString(),
      updatedAt: log.user.updatedAt.toISOString()
    } : undefined
  };
};

// GET /api/audit-logs - List audit logs (admin only, paginated)
router.get('/', requireAuth, requireSystemAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const skip = (page - 1) * limit;

  // Optional filters
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const method = req.query.method as string | undefined;
  const path = req.query.path as string | undefined;

  const where: any = {};
  if (userId) where.userId = userId;
  if (method) where.method = method;
  if (path) where.path = { contains: path };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isSystemAdmin: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  const response: PaginatedResponse<AuditLog> = {
    success: true,
    data: items.map(formatAuditLog),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

export default router;
