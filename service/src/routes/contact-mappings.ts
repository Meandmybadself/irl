import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, systemContactInformationSchema, personContactInformationSchema, groupContactInformationSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, PaginatedResponse, SystemContactInformation, PersonContactInformation, GroupContactInformation } from '@irl/shared';

const router = Router();

// System Contact Information Routes
// GET /api/contact-mappings/system - List all system contact information mappings
router.get('/system', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.systemContactInformation.findMany({
      skip,
      take: limit,
      orderBy: { id: 'desc' }
    }),
    prisma.systemContactInformation.count()
  ]);

  const response: PaginatedResponse<SystemContactInformation> = {
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// POST /api/contact-mappings/system - Create new system contact information mapping
router.post('/system', requireAuth, validateBody(systemContactInformationSchema), asyncHandler(async (req, res) => {
  // Check if system exists
  const systemExists = await prisma.system.findFirst({
    where: { id: req.body.systemId, deleted: false }
  });

  if (!systemExists) {
    throw createError(400, 'Referenced system does not exist');
  }

  // Check if contact information exists
  const contactExists = await prisma.contactInformation.findFirst({
    where: { id: req.body.contactInformationId, deleted: false }
  });

  if (!contactExists) {
    throw createError(400, 'Referenced contact information does not exist');
  }

  const item = await prisma.systemContactInformation.create({
    data: req.body
  });

  const response: ApiResponse<SystemContactInformation> = {
    success: true,
    data: item,
    message: 'System contact information mapping created successfully'
  };

  res.status(201).json(response);
}));

// DELETE /api/contact-mappings/system/:id - Delete system contact information mapping
router.delete('/system/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.systemContactInformation.delete({
    where: { id }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'System contact information mapping deleted successfully'
  };

  res.json(response);
}));

// Person Contact Information Routes
// GET /api/contact-mappings/person - List all person contact information mappings
router.get('/person', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.personContactInformation.findMany({
      skip,
      take: limit,
      orderBy: { id: 'desc' }
    }),
    prisma.personContactInformation.count()
  ]);

  const response: PaginatedResponse<PersonContactInformation> = {
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// POST /api/contact-mappings/person - Create new person contact information mapping
router.post('/person', requireAuth, validateBody(personContactInformationSchema), asyncHandler(async (req, res) => {
  // Check if person exists
  const personExists = await prisma.person.findFirst({
    where: { id: req.body.personId, deleted: false }
  });

  if (!personExists) {
    throw createError(400, 'Referenced person does not exist');
  }

  // Check if contact information exists
  const contactExists = await prisma.contactInformation.findFirst({
    where: { id: req.body.contactInformationId, deleted: false }
  });

  if (!contactExists) {
    throw createError(400, 'Referenced contact information does not exist');
  }

  const item = await prisma.personContactInformation.create({
    data: req.body
  });

  const response: ApiResponse<PersonContactInformation> = {
    success: true,
    data: item,
    message: 'Person contact information mapping created successfully'
  };

  res.status(201).json(response);
}));

// DELETE /api/contact-mappings/person/:id - Delete person contact information mapping
router.delete('/person/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.personContactInformation.delete({
    where: { id }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Person contact information mapping deleted successfully'
  };

  res.json(response);
}));

// Group Contact Information Routes
// GET /api/contact-mappings/group - List all group contact information mappings
router.get('/group', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.groupContactInformation.findMany({
      skip,
      take: limit,
      orderBy: { id: 'desc' }
    }),
    prisma.groupContactInformation.count()
  ]);

  const response: PaginatedResponse<GroupContactInformation> = {
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// POST /api/contact-mappings/group - Create new group contact information mapping
router.post('/group', requireAuth, validateBody(groupContactInformationSchema), asyncHandler(async (req, res) => {
  // Check if group exists
  const groupExists = await prisma.group.findFirst({
    where: { id: req.body.groupId, deleted: false }
  });

  if (!groupExists) {
    throw createError(400, 'Referenced group does not exist');
  }

  // Check if contact information exists
  const contactExists = await prisma.contactInformation.findFirst({
    where: { id: req.body.contactInformationId, deleted: false }
  });

  if (!contactExists) {
    throw createError(400, 'Referenced contact information does not exist');
  }

  const item = await prisma.groupContactInformation.create({
    data: req.body
  });

  const response: ApiResponse<GroupContactInformation> = {
    success: true,
    data: item,
    message: 'Group contact information mapping created successfully'
  };

  res.status(201).json(response);
}));

// DELETE /api/contact-mappings/group/:id - Delete group contact information mapping
router.delete('/group/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.groupContactInformation.delete({
    where: { id }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Group contact information mapping deleted successfully'
  };

  res.json(response);
}));

export default router;