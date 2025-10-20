import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, groupSchema, updateGroupSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeSearchQuery, sanitizePaginationParams } from '../utils/sanitization.js';
import type { ApiResponse, PaginatedResponse, Group } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format group response
const formatGroup = (group: any): Group => {
  const { deleted, ...groupWithoutDeleted } = group;
  void deleted;
  return {
    ...groupWithoutDeleted,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString()
  };
};

// GET /api/groups - List all groups (auth required)
// Supports optional search query parameter: ?search=term
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  // Sanitize pagination parameters
  const { page, limit, skip } = sanitizePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );

  // Sanitize search query
  const searchQuery = sanitizeSearchQuery(req.query.search as string);

  // Build where clause with search if provided
  const where: any = { deleted: false };
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
      { displayId: { contains: searchQuery, mode: 'insensitive' } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.group.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.group.count({ where })
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

// GET /api/groups/:id - Get specific group (auth required)
router.get('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
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

// POST /api/groups - Create new group (auth required)
router.post('/', requireAuth, validateBody(groupSchema), asyncHandler(async (req, res) => {
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

// PUT /api/groups/:id - Update entire group (auth required)
router.put('/:id', requireAuth, validateIdParam, validateBody(groupSchema), asyncHandler(async (req, res) => {
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

// PATCH /api/groups/:id - Partial update group (auth required)
router.patch('/:id', requireAuth, validateIdParam, validateBody(updateGroupSchema), asyncHandler(async (req, res) => {
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

// DELETE /api/groups/:id - Soft delete group (auth required)
router.delete('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
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
