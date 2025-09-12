import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, claimSchema, updateClaimSchema } from '../middleware/validation.js';
import type { ApiResponse, PaginatedResponse, Claim } from '@irl/shared';

const router = Router();

// Helper to format claim response
const formatClaim = (claim: any): Claim => ({
  ...claim,
  claimedAt: claim.claimedAt?.toISOString() || null,
  expiresAt: claim.expiresAt.toISOString(),
  createdAt: claim.createdAt.toISOString(),
  updatedAt: claim.updatedAt.toISOString()
});

// GET /api/claims - List all claims
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.claim.findMany({
      where: { deleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.claim.count({ where: { deleted: false } })
  ]);

  const response: PaginatedResponse<Claim> = {
    success: true,
    data: items.map(formatClaim),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/claims/:id - Get specific claim
router.get('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  const item = await prisma.claim.findFirst({
    where: { id, deleted: false }
  });

  if (!item) {
    throw createError(404, 'Claim not found');
  }

  const response: ApiResponse<Claim> = {
    success: true,
    data: formatClaim(item)
  };

  res.json(response);
}));

// POST /api/claims - Create new claim
router.post('/', validateBody(claimSchema), asyncHandler(async (req, res) => {
  // Check if person exists
  const personExists = await prisma.person.findFirst({
    where: { id: req.body.personId, deleted: false }
  });

  if (!personExists) {
    throw createError(400, 'Referenced person does not exist');
  }

  // Check if requesting user exists
  const userExists = await prisma.user.findFirst({
    where: { id: req.body.requestingUser, deleted: false }
  });

  if (!userExists) {
    throw createError(400, 'Referenced requesting user does not exist');
  }

  const item = await prisma.claim.create({
    data: {
      ...req.body,
      expiresAt: new Date(req.body.expiresAt)
    }
  });

  const response: ApiResponse<Claim> = {
    success: true,
    data: formatClaim(item),
    message: 'Claim created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/claims/:id - Update entire claim
router.put('/:id', validateIdParam, validateBody(claimSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if person exists
  const personExists = await prisma.person.findFirst({
    where: { id: req.body.personId, deleted: false }
  });

  if (!personExists) {
    throw createError(400, 'Referenced person does not exist');
  }

  // Check if requesting user exists
  const userExists = await prisma.user.findFirst({
    where: { id: req.body.requestingUser, deleted: false }
  });

  if (!userExists) {
    throw createError(400, 'Referenced requesting user does not exist');
  }

  const item = await prisma.claim.update({
    where: { id },
    data: {
      ...req.body,
      expiresAt: new Date(req.body.expiresAt)
    }
  });

  const response: ApiResponse<Claim> = {
    success: true,
    data: formatClaim(item),
    message: 'Claim updated successfully'
  };

  res.json(response);
}));

// PATCH /api/claims/:id - Partial update claim
router.patch('/:id', validateIdParam, validateBody(updateClaimSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Check if person exists (if being updated)
  if (req.body.personId) {
    const personExists = await prisma.person.findFirst({
      where: { id: req.body.personId, deleted: false }
    });

    if (!personExists) {
      throw createError(400, 'Referenced person does not exist');
    }
  }

  // Check if requesting user exists (if being updated)
  if (req.body.requestingUser) {
    const userExists = await prisma.user.findFirst({
      where: { id: req.body.requestingUser, deleted: false }
    });

    if (!userExists) {
      throw createError(400, 'Referenced requesting user does not exist');
    }
  }

  const updateData = { ...req.body };
  if (req.body.expiresAt) {
    updateData.expiresAt = new Date(req.body.expiresAt);
  }
  if (req.body.claimedAt) {
    updateData.claimedAt = new Date(req.body.claimedAt);
  }

  const item = await prisma.claim.update({
    where: { id },
    data: updateData
  });

  const response: ApiResponse<Claim> = {
    success: true,
    data: formatClaim(item),
    message: 'Claim updated successfully'
  };

  res.json(response);
}));

// DELETE /api/claims/:id - Soft delete claim
router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.claim.update({
    where: { id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Claim deleted successfully'
  };

  res.json(response);
}));

export default router;