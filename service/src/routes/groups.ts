import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, groupSchema, updateGroupSchema } from '../middleware/validation.js';
import type { ApiResponse, PaginatedResponse, Group } from '@irl/shared';

const router = Router();

// Helper to format group response
const formatGroup = (group: any): Group => ({
  ...group,
  createdAt: group.createdAt.toISOString(),
  updatedAt: group.updatedAt.toISOString()
});

// GET /api/groups - List all groups
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.group.findMany({
      where: { deleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.group.count({ where: { deleted: false } })
  ]);

  const response: PaginatedResponse<Group> = {
    success: true,
    data: items.map(formatGroup),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/groups/:id - Get specific group
router.get('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  const item = await prisma.group.findFirst({
    where: { id, deleted: false }
  });

  if (!item) {
    throw createError(404, 'Group not found');
  }

  const response: ApiResponse<Group> = {
    success: true,
    data: formatGroup(item)
  };

  res.json(response);
}));

// POST /api/groups - Create new group
router.post('/', validateBody(groupSchema), asyncHandler(async (req, res) => {
  // Check if parent group exists (if parentGroupId is provided)
  if (req.body.parentGroupId) {
    const parentExists = await prisma.group.findFirst({
      where: { id: req.body.parentGroupId, deleted: false }
    });

    if (!parentExists) {
      throw createError(400, 'Referenced parent group does not exist');
    }
  }

  const item = await prisma.group.create({
    data: req.body
  });

  const response: ApiResponse<Group> = {
    success: true,
    data: formatGroup(item),
    message: 'Group created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/groups/:id - Update entire group
router.put('/:id', validateIdParam, validateBody(groupSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if parent group exists (if parentGroupId is provided)
  if (req.body.parentGroupId) {
    const parentExists = await prisma.group.findFirst({
      where: { id: req.body.parentGroupId, deleted: false }
    });

    if (!parentExists) {
      throw createError(400, 'Referenced parent group does not exist');
    }
  }

  const item = await prisma.group.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<Group> = {
    success: true,
    data: formatGroup(item),
    message: 'Group updated successfully'
  };

  res.json(response);
}));

// PATCH /api/groups/:id - Partial update group
router.patch('/:id', validateIdParam, validateBody(updateGroupSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if parent group exists (if parentGroupId is being updated)
  if (req.body.parentGroupId) {
    const parentExists = await prisma.group.findFirst({
      where: { id: req.body.parentGroupId, deleted: false }
    });

    if (!parentExists) {
      throw createError(400, 'Referenced parent group does not exist');
    }
  }

  const item = await prisma.group.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<Group> = {
    success: true,
    data: formatGroup(item),
    message: 'Group updated successfully'
  };

  res.json(response);
}));

// DELETE /api/groups/:id - Soft delete group
router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.group.update({
    where: { id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Group deleted successfully'
  };

  res.json(response);
}));

export default router;