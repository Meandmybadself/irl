import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, systemContactInformationSchema, personContactInformationSchema, groupContactInformationSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, SystemContactInformation, PersonContactInformation, GroupContactInformation } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// System Contact Information Routes
// GET /api/contact-mappings/system - Get contact information for the system
router.get('/system', requireAuth, asyncHandler(async (_req, res) => {
  // Get the system (there's only one)
  const system = await prisma.system.findFirst({
    where: { deleted: false }
  });

  if (!system) {
    const response: ApiResponse<any[]> = {
      success: true,
      data: []
    };
    res.json(response);
    return;
  }

  // Get all contact information for this system
  const mappings = await prisma.systemContactInformation.findMany({
    where: { systemId: system.id },
    include: {
      contactInformation: true
    }
  });

  const contactInfos = mappings.map(m => m.contactInformation);

  const response: ApiResponse<any[]> = {
    success: true,
    data: contactInfos
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
// GET /api/contact-mappings/person/:personId - Get contact information for a specific person
router.get('/person/:personId', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const personId = parseInt(req.params.personId);

  // Get all contact information for this person
  const mappings = await prisma.personContactInformation.findMany({
    where: { personId },
    include: {
      contactInformation: true
    }
  });

  const contactInfos = mappings.map(m => m.contactInformation);

  const response: ApiResponse<any[]> = {
    success: true,
    data: contactInfos
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
// GET /api/contact-mappings/group/:groupId - Get contact information for a specific group
router.get('/group/:groupId', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const groupId = parseInt(req.params.groupId);

  // Get all contact information for this group
  const mappings = await prisma.groupContactInformation.findMany({
    where: { groupId },
    include: {
      contactInformation: true
    }
  });

  const contactInfos = mappings.map(m => m.contactInformation);

  const response: ApiResponse<any[]> = {
    success: true,
    data: contactInfos
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
