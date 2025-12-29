import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, interestSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { canManageInterests } from '../middleware/authorization.js';
import type { ApiResponse, PaginatedResponse, Interest } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format interest response
const formatInterest = (interest: any): Interest => {
  const { deleted, ...interestWithoutDeleted } = interest;
  void deleted;
  return {
    ...interestWithoutDeleted,
    createdAt: interest.createdAt.toISOString(),
    updatedAt: interest.updatedAt.toISOString()
  };
};

// GET /api/interests - List all non-deleted interests (optional category filter)
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const skip = (page - 1) * limit;
  const category = req.query.category as string | undefined;

  const where: any = { deleted: false };
  if (category) {
    where.category = category;
  }

  const [items, total] = await Promise.all([
    prisma.interest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' }
    }),
    prisma.interest.count({ where })
  ]);

  const response: PaginatedResponse<Interest> = {
    success: true,
    data: items.map(formatInterest),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// POST /api/interests - Create new interest (admin only)
router.post('/', requireAuth, canManageInterests, validateBody(interestSchema), asyncHandler(async (req, res) => {
  // Check if interest with same name and category already exists (non-deleted)
  const existing = await prisma.interest.findFirst({
    where: {
      name: req.body.name,
      category: req.body.category,
      deleted: false
    }
  });

  if (existing) {
    throw createError(400, 'An interest with this name and category already exists');
  }

  const item = await prisma.interest.create({
    data: req.body
  });

  const response: ApiResponse<Interest> = {
    success: true,
    data: formatInterest(item),
    message: 'Interest created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/interests/:id - Update interest (admin only)
router.put('/:id', requireAuth, canManageInterests, validateIdParam, validateBody(interestSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const interest = await prisma.interest.findUnique({
    where: { id }
  });

  if (!interest) {
    throw createError(404, 'Interest not found');
  }

  if (interest.deleted) {
    throw createError(400, 'Cannot update a deleted interest');
  }

  // Check if another interest with same name and category already exists
  const existing = await prisma.interest.findFirst({
    where: {
      name: req.body.name,
      category: req.body.category,
      deleted: false,
      id: { not: id }
    }
  });

  if (existing) {
    throw createError(400, 'An interest with this name and category already exists');
  }

  const updated = await prisma.interest.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<Interest> = {
    success: true,
    data: formatInterest(updated),
    message: 'Interest updated successfully'
  };

  res.json(response);
}));

// DELETE /api/interests/:id - Soft delete interest (admin only)
router.delete('/:id', requireAuth, canManageInterests, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const interest = await prisma.interest.findUnique({
    where: { id }
  });

  if (!interest) {
    throw createError(404, 'Interest not found');
  }

  if (interest.deleted) {
    throw createError(400, 'Interest is already deleted');
  }

  await prisma.interest.update({
    where: { id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Interest deleted successfully'
  };

  res.json(response);
}));

// GET /api/interests/categories - Get list of distinct categories (admin only)
router.get('/categories', requireAuth, canManageInterests, asyncHandler(async (_req, res) => {
  const interests = await prisma.interest.findMany({
    where: { deleted: false },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' }
  });

  const categories = interests.map(i => i.category);

  const response: ApiResponse<string[]> = {
    success: true,
    data: categories
  };

  res.json(response);
}));

// PUT /api/interests/categories/:name - Rename a category (admin only)
router.put('/categories/:name', requireAuth, canManageInterests, asyncHandler(async (req, res) => {
  const oldName = decodeURIComponent(req.params.name);
  const { newName } = req.body;

  if (!newName || typeof newName !== 'string' || !newName.trim()) {
    throw createError(400, 'New category name is required');
  }

  // Check if old category exists
  const oldCategoryExists = await prisma.interest.findFirst({
    where: { category: oldName, deleted: false }
  });

  if (!oldCategoryExists) {
    throw createError(404, 'Category not found');
  }

  // Check if new category already exists (and is different from old)
  if (oldName !== newName.trim()) {
    const newCategoryExists = await prisma.interest.findFirst({
      where: { category: newName.trim(), deleted: false }
    });

    if (newCategoryExists) {
      throw createError(400, 'A category with the new name already exists');
    }
  }

  // Update all interests with the old category
  await prisma.interest.updateMany({
    where: { category: oldName, deleted: false },
    data: { category: newName.trim() }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Category renamed successfully'
  };

  res.json(response);
}));

// DELETE /api/interests/categories/:name - Delete a category and all its interests (admin only)
router.delete('/categories/:name', requireAuth, canManageInterests, asyncHandler(async (req, res) => {
  const categoryName = decodeURIComponent(req.params.name);

  // Check if category exists
  const categoryExists = await prisma.interest.findFirst({
    where: { category: categoryName, deleted: false }
  });

  if (!categoryExists) {
    throw createError(404, 'Category not found');
  }

  // Soft delete all interests in this category
  await prisma.interest.updateMany({
    where: { category: categoryName, deleted: false },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Category and all its interests deleted successfully'
  };

  res.json(response);
}));

export default router;




