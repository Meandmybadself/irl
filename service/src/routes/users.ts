import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { sendVerificationEmail } from '../lib/email.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, userSchema, updateUserSchema, validateIdParam } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { sanitizePaginationParams, sanitizeEmail } from '../utils/sanitization.js';
import type { ApiResponse, PaginatedResponse, User } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to exclude sensitive and internal fields from user responses
const excludeSensitiveFields = (user: any): User => {
  const { password, verificationToken, deleted, ...userWithoutSensitive } = user;
  void password;
  void verificationToken;
  void deleted;
  return {
    ...userWithoutSensitive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
};

interface UpdatedUserResult {
  item: any;
  verificationToken: string | null;
}

const updateUserRecord = async (id: number, body: any): Promise<UpdatedUserResult> => {
  const users = await prisma.user.findMany({
    where: { 
      id,
      deleted: false,

    },
    take: 1
  });

  const existingUser = users[0];
  if (!existingUser) {
    throw createError(404, 'User not found');
  }

  const { password, ...userData } = body;
  const updateData: any = { ...userData };
  let verificationToken: string | null = null;

  if (password) {
    const saltRounds = 12;
    updateData.password = await bcrypt.hash(password, saltRounds);
  }

  if (typeof userData.email === 'string' && userData.email !== existingUser.email) {
    verificationToken = crypto.randomBytes(32).toString('hex');
    updateData.verificationToken = verificationToken;
  }

  const item = await prisma.user.update({
    where: { id: existingUser.id },
    data: updateData
  });

  return {
    item,
    verificationToken
  };
};

// GET /api/users - List all users (auth required)
// Supports optional search query parameter: ?search=term (searches email)
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  // Sanitize pagination parameters
  const { page, limit, skip } = sanitizePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );

  // Sanitize search query (for email search)
  const searchQuery = sanitizeEmail(req.query.search as string);

  // Build where clause with search if provided
  const where: any = { deleted: false };
  if (searchQuery) {
    where.email = { contains: searchQuery, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  const response: PaginatedResponse<User> = {
    success: true,
    data: items.map(excludeSensitiveFields),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/users/verify - Verify user email via token
router.get('/verify', asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    throw createError(400, 'Verification token is required');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      deleted: false
    }
  });

  if (!existingUser) {
    throw createError(404, 'Verification token invalid or expired');
  }

  const updatedUser = await prisma.user.update({
    where: { id: existingUser.id },
    data: { verificationToken: null }
  });

  const response: ApiResponse<User> = {
    success: true,
    data: excludeSensitiveFields(updatedUser),
    message: 'Email verified successfully'
  };

  res.json(response);
}));

// GET /api/users/:id - Get specific user (auth required)
router.get('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  const users = await prisma.user.findMany({
    where: { 
      id,
      deleted: false 
    },
    take: 1
  });

  const item = users[0];
  if (!item) {
    throw createError(404, 'User not found');
  }

  const response: ApiResponse<User> = {
    success: true,
    data: excludeSensitiveFields(item)
  };

  res.json(response);
}));

// POST /api/users - Create new user
router.post('/', validateBody(userSchema), asyncHandler(async (req, res) => {
  const { password, isSystemAdmin: requestedAdmin, ...userData } = req.body;
  
  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Promote the first user account to system admin automatically
  const userCount = await prisma.user.count({ where: { deleted: false } });
  const isSystemAdmin = userCount === 0 ? true : Boolean(requestedAdmin);
  const isFirstUser = userCount === 0;

  const item = await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
      verificationToken: isFirstUser ? null : verificationToken,
      isSystemAdmin
    }
  });

  // Only send verification email if this is not the first user
  if (!isFirstUser) {
    try {
      await sendVerificationEmail(item.email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }
  }

  const response: ApiResponse<User> = {
    success: true,
    data: excludeSensitiveFields(item),
    message: isFirstUser ? 'Account created successfully' : 'User created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/users/:id - Update entire user (auth required)
router.put('/:id', requireAuth, validateIdParam, validateBody(userSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { item, verificationToken } = await updateUserRecord(id, req.body);

  if (verificationToken) {
    try {
      await sendVerificationEmail(item.email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }
  }

  const response: ApiResponse<User> = {
    success: true,
    data: excludeSensitiveFields(item),
    message: 'User updated successfully'
  };

  res.json(response);
}));

// PATCH /api/users/:id - Partial update user (auth required)
router.patch('/:id', requireAuth, validateIdParam, validateBody(updateUserSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { item, verificationToken } = await updateUserRecord(id, req.body);

  if (verificationToken) {
    try {
      await sendVerificationEmail(item.email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }
  }

  const response: ApiResponse<User> = {
    success: true,
    data: excludeSensitiveFields(item),
    message: 'User updated successfully'
  };

  res.json(response);
}));

// DELETE /api/users/:id - Soft delete user (auth required)
router.delete('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const users = await prisma.user.findMany({
    where: { 
      id,
      deleted: false 
    },
    take: 1
  });

  const existingUser = users[0];
  if (!existingUser) {
    throw createError(404, 'User not found');
  }

  await prisma.user.update({
    where: { id: existingUser.id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'User deleted successfully'
  };

  res.json(response);
}));

export default router;
