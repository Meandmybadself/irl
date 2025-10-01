import { Router } from 'express';
import type { System as PrismaSystem } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, systemSchema, updateSystemSchema } from '../middleware/validation.js';
import { requireSystemAdmin } from '../middleware/auth.js';
import type { ApiResponse, System } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

const SINGLE_SYSTEM_ID = 1;

type PersistedSystem = PrismaSystem;

const formatSystem = ({ id, name, registrationOpen, createdAt, updatedAt }: PersistedSystem): System => ({
  id,
  name,
  registrationOpen,
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString()
});

const findActiveSystem = async (): Promise<PersistedSystem | null> => {
  return prisma.system.findFirst({
    where: {
      id: SINGLE_SYSTEM_ID,
      deleted: false
    }
  });
};

// GET /api/system - Retrieve the singleton system configuration
router.get('/', asyncHandler(async (_req, res) => {
  const item = await findActiveSystem();

  if (!item) {
    throw createError(404, 'System not found');
  }

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item)
  };

  res.json(response);
}));

// POST /api/system - Create the singleton system (admin only)
router.post('/', requireSystemAdmin, validateBody(systemSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.system.findUnique({ where: { id: SINGLE_SYSTEM_ID } });

  if (existing && !existing.deleted) {
    throw createError(409, 'System already exists');
  }

  const item = await prisma.system.upsert({
    where: { id: SINGLE_SYSTEM_ID },
    update: { ...req.body, deleted: false },
    create: { id: SINGLE_SYSTEM_ID, ...req.body }
  });

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item),
    message: 'System created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/system - Replace the singleton system (admin only)
router.put('/', requireSystemAdmin, validateBody(systemSchema), asyncHandler(async (req, res) => {
  const item = await prisma.system.upsert({
    where: { id: SINGLE_SYSTEM_ID },
    update: { ...req.body, deleted: false },
    create: { id: SINGLE_SYSTEM_ID, ...req.body }
  });

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item),
    message: 'System updated successfully'
  };

  res.json(response);
}));

// PATCH /api/system - Partially update the singleton system (admin only)
router.patch('/', requireSystemAdmin, validateBody(updateSystemSchema), asyncHandler(async (req, res) => {
  const existing = await findActiveSystem();

  if (!existing) {
    throw createError(404, 'System not found');
  }

  const item = await prisma.system.update({
    where: { id: SINGLE_SYSTEM_ID },
    data: req.body
  });

  const response: ApiResponse<System> = {
    success: true,
    data: formatSystem(item),
    message: 'System updated successfully'
  };

  res.json(response);
}));

// DELETE /api/system - Soft delete the singleton system (admin only)
router.delete('/', requireSystemAdmin, asyncHandler(async (_req, res) => {
  const existing = await findActiveSystem();

  if (!existing) {
    throw createError(404, 'System not found');
  }

  await prisma.system.update({
    where: { id: SINGLE_SYSTEM_ID },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'System deleted successfully'
  };

  res.json(response);
}));

export default router;
