import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { sendVerificationEmail } from '../lib/email.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, userSchema, updateUserSchema, validateIdParam, changePasswordSchema, changeEmailSchema } from '../middleware/validation.js';
import { requireSystemAdmin, requireAuth } from '../middleware/auth.js';
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

// GET /api/users/me - Get current user profile
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required');
  }

  const user = await prisma.user.findUnique({
    where: { 
      id: req.user.id,
      deleted: false 
    }
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  // Check for pending email change
  const pendingEmailChange = await prisma.emailChangeRequest.findFirst({
    where: {
      userId: req.user.id,
      expiresAt: { gte: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  const response: ApiResponse<User & { pendingEmail?: string }> = {
    success: true,
    data: {
      ...excludeSensitiveFields(user),
      pendingEmail: pendingEmailChange?.newEmail
    }
  };

  res.json(response);
}));

// POST /api/users/me/password - Change password
router.post('/me/password', requireAuth, validateBody(changePasswordSchema), asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required');
  }

  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { 
      id: req.user.id,
      deleted: false 
    }
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    throw createError(401, 'Current password is incorrect');
  }

  // Hash new password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Password updated successfully'
  };

  res.json(response);
}));

// POST /api/users/me/email - Request email change
router.post('/me/email', requireAuth, validateBody(changeEmailSchema), asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required');
  }

  const { newEmail } = req.body;

  const user = await prisma.user.findUnique({
    where: { 
      id: req.user.id,
      deleted: false 
    }
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  // Check if email is already in use
  const existingUser = await prisma.user.findFirst({
    where: {
      email: newEmail,
      deleted: false
    }
  });

  if (existingUser) {
    throw createError(400, 'Email address is already in use');
  }

  // Check if user already has the email
  if (user.email === newEmail) {
    throw createError(400, 'New email must be different from current email');
  }

  // Delete any existing email change requests for this user
  await prisma.emailChangeRequest.deleteMany({
    where: { userId: user.id }
  });

  // Create new email change request with verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  await prisma.emailChangeRequest.create({
    data: {
      userId: user.id,
      newEmail,
      verificationToken,
      expiresAt
    }
  });

  // Send verification email to new address
  try {
    await sendVerificationEmail(newEmail, verificationToken, 'verify-email-change');
  } catch (error) {
    console.error('Failed to send email change verification:', error);
    throw createError(500, 'Failed to send verification email');
  }

  const response: ApiResponse<null> = {
    success: true,
    message: 'Verification email sent to new address'
  };

  res.json(response);
}));

// GET /api/users/verify-email-change - Verify email change
router.get('/verify-email-change', asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    throw createError(400, 'Verification token is required');
  }

  const emailChangeRequest = await prisma.emailChangeRequest.findUnique({
    where: { verificationToken: token },
    include: { user: true }
  });

  if (!emailChangeRequest) {
    throw createError(404, 'Verification token invalid or expired');
  }

  // Check if token is expired
  if (emailChangeRequest.expiresAt < new Date()) {
    throw createError(400, 'Verification token has expired');
  }

  // Check if new email is still available
  const existingUser = await prisma.user.findFirst({
    where: {
      email: emailChangeRequest.newEmail,
      deleted: false
    }
  });

  if (existingUser) {
    throw createError(400, 'Email address is no longer available');
  }

  // Update user's email
  const updatedUser = await prisma.user.update({
    where: { id: emailChangeRequest.userId },
    data: { email: emailChangeRequest.newEmail }
  });

  // Delete the email change request
  await prisma.emailChangeRequest.delete({
    where: { id: emailChangeRequest.id }
  });

  const response: ApiResponse<User> = {
    success: true,
    data: excludeSensitiveFields(updatedUser),
    message: 'Email address updated successfully'
  };

  res.json(response);
}));

// GET /api/users - List all users (admin only)
router.get('/', requireSystemAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const where: any = { deleted: false };

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

// GET /api/users/:id - Get specific user (admin only)
router.get('/:id', requireSystemAdmin, validateIdParam, asyncHandler(async (req, res) => {
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

// PUT /api/users/:id - Update entire user (admin only)
router.put('/:id', requireSystemAdmin, validateIdParam, validateBody(userSchema), asyncHandler(async (req, res) => {
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

// PATCH /api/users/:id - Partial update user (admin only)
router.patch('/:id', requireSystemAdmin, validateIdParam, validateBody(updateUserSchema), asyncHandler(async (req, res) => {
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

// DELETE /api/users/:id - Soft delete user (admin only)
router.delete('/:id', requireSystemAdmin, validateIdParam, asyncHandler(async (req, res) => {
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
