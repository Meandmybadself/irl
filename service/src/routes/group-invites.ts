import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, groupInviteSchema, updateGroupInviteSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, PaginatedResponse, GroupInvite } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format group invite response
const formatGroupInvite = (groupInvite: any): GroupInvite => ({
  ...groupInvite,
  acceptedAt: groupInvite.acceptedAt?.toISOString() || null,
  createdAt: groupInvite.createdAt.toISOString(),
  updatedAt: groupInvite.updatedAt.toISOString()
});

// GET /api/group-invites - List all group invites
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.groupInvite.findMany({
      where: { deleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.groupInvite.count({ where: { deleted: false } })
  ]);

  const response: PaginatedResponse<GroupInvite> = {
    success: true,
    data: items.map(formatGroupInvite),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/group-invites/:id - Get specific group invite
router.get('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  const item = await prisma.groupInvite.findFirst({
    where: { id, deleted: false }
  });

  if (!item) {
    throw createError(404, 'Group invite not found');
  }

  const response: ApiResponse<GroupInvite> = {
    success: true,
    data: formatGroupInvite(item)
  };

  res.json(response);
}));

// POST /api/group-invites - Create new group invite
router.post('/', requireAuth, validateBody(groupInviteSchema), asyncHandler(async (req, res) => {
  // Check if group exists
  const groupExists = await prisma.group.findFirst({
    where: { id: req.body.groupId, deleted: false }
  });

  if (!groupExists) {
    throw createError(400, 'Referenced group does not exist');
  }

  const item = await prisma.groupInvite.create({
    data: req.body
  });

  const response: ApiResponse<GroupInvite> = {
    success: true,
    data: formatGroupInvite(item),
    message: 'Group invite created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/group-invites/:id - Update entire group invite
router.put('/:id', requireAuth, validateIdParam, validateBody(groupInviteSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if group exists
  const groupExists = await prisma.group.findFirst({
    where: { id: req.body.groupId, deleted: false }
  });

  if (!groupExists) {
    throw createError(400, 'Referenced group does not exist');
  }

  const item = await prisma.groupInvite.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<GroupInvite> = {
    success: true,
    data: formatGroupInvite(item),
    message: 'Group invite updated successfully'
  };

  res.json(response);
}));

// PATCH /api/group-invites/:id - Partial update group invite
router.patch('/:id', requireAuth, validateIdParam, validateBody(updateGroupInviteSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if group exists (if being updated)
  if (req.body.groupId) {
    const groupExists = await prisma.group.findFirst({
      where: { id: req.body.groupId, deleted: false }
    });

    if (!groupExists) {
      throw createError(400, 'Referenced group does not exist');
    }
  }

  const updateData = { ...req.body };
  if (req.body.acceptedAt) {
    updateData.acceptedAt = new Date(req.body.acceptedAt);
  }

  const item = await prisma.groupInvite.update({
    where: { id },
    data: updateData
  });

  const response: ApiResponse<GroupInvite> = {
    success: true,
    data: formatGroupInvite(item),
    message: 'Group invite updated successfully'
  };

  res.json(response);
}));

// DELETE /api/group-invites/:id - Soft delete group invite
router.delete('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.groupInvite.update({
    where: { id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Group invite deleted successfully'
  };

  res.json(response);
}));

export default router;
