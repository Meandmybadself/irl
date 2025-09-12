import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, systemSchema, updateSystemSchema } from '../middleware/validation.js';
import type { ApiResponse, PaginatedResponse, System } from '@irl/shared';

const router = Router();

// Helper to format system response
const formatSystem = (system: any): System => ({
  ...system,
  createdAt: system.createdAt.toISOString(),
  updatedAt: system.updatedAt.toISOString()
});

// GET /api/systems - List all systems
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.system.findMany({
      where: { deleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.system.count({ where: { deleted: false } })
  ]);

  const response: PaginatedResponse<System> = {
    success: true,
    data: items.map(formatSystem),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/systems/:id - Get specific system
router.get('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  const item = await prisma.system.findFirst({
    where: { id, deleted: false }
  });

  if (!item) {
    throw createError(404, 'System not found');
  }

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item)
  };

  res.json(response);
}));

// POST /api/systems - Create new system
router.post('/', validateBody(systemSchema), asyncHandler(async (req, res) => {
  const item = await prisma.system.create({
    data: req.body
  });

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item),
    message: 'System created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/systems/:id - Update entire system
router.put('/:id', validateIdParam, validateBody(systemSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const item = await prisma.system.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item),
    message: 'System updated successfully'
  };

  res.json(response);
}));

// PATCH /api/systems/:id - Partial update system
router.patch('/:id', validateIdParam, validateBody(updateSystemSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const item = await prisma.system.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item),
    message: 'System updated successfully'
  };

  res.json(response);
}));

// DELETE /api/systems/:id - Soft delete system
router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.system.update({
    where: { id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'System deleted successfully'
  };

  res.json(response);
}));

export default router;