import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, userSchema, updateUserSchema } from '../middleware/validation.js';
import type { ApiResponse, PaginatedResponse, User } from '@irl/shared';

const router = Router();

// Helper to exclude password from user responses
const excludePassword = (user: any): User => {
  const { password, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
};

// GET /api/users - List all users
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where: { deleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where: { deleted: false } })
  ]);

  const response: PaginatedResponse<User> = {
    success: true,
    data: items.map(excludePassword),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/users/:id - Get specific user
router.get('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  const item = await prisma.user.findFirst({
    where: { id, deleted: false }
  });

  if (!item) {
    throw createError(404, 'User not found');
  }

  const response: ApiResponse<User> = {
    success: true,
    data: excludePassword(item)
  };

  res.json(response);
}));

// POST /api/users - Create new user
router.post('/', validateBody(userSchema), asyncHandler(async (req, res) => {
  const { password, ...userData } = req.body;
  
  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const item = await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword
    }
  });

  const response: ApiResponse<User> = {
    success: true,
    data: excludePassword(item),
    message: 'User created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/users/:id - Update entire user
router.put('/:id', validateIdParam, validateBody(userSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { password, ...userData } = req.body;

  let updateData: any = userData;
  if (password) {
    const saltRounds = 12;
    updateData.password = await bcrypt.hash(password, saltRounds);
  }

  const item = await prisma.user.update({
    where: { id },
    data: updateData
  });

  const response: ApiResponse<User> = {
    success: true,
    data: excludePassword(item),
    message: 'User updated successfully'
  };

  res.json(response);
}));

// PATCH /api/users/:id - Partial update user
router.patch('/:id', validateIdParam, validateBody(updateUserSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { password, ...userData } = req.body;

  let updateData: any = userData;
  if (password) {
    const saltRounds = 12;
    updateData.password = await bcrypt.hash(password, saltRounds);
  }

  const item = await prisma.user.update({
    where: { id },
    data: updateData
  });

  const response: ApiResponse<User> = {
    success: true,
    data: excludePassword(item),
    message: 'User updated successfully'
  };

  res.json(response);
}));

// DELETE /api/users/:id - Soft delete user
router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.user.update({
    where: { id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'User deleted successfully'
  };

  res.json(response);
}));

export default router;