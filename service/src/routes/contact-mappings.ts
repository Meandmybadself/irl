import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, systemContactInformationSchema, personContactInformationSchema, groupContactInformationSchema, validateDisplayIdParam } from '../middleware/validation.js';
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
  const item = await prisma.$transaction(async (tx) => {
    // Check if system exists
    const systemExists = await tx.system.findFirst({
      where: { id: req.body.systemId, deleted: false }
    });

    if (!systemExists) {
      throw createError(400, 'Referenced system does not exist');
    }

    // Check if contact information exists
    const contactExists = await tx.contactInformation.findFirst({
      where: { id: req.body.contactInformationId, deleted: false }
    });

    if (!contactExists) {
      throw createError(400, 'Referenced contact information does not exist');
    }

    // Create the mapping
    return await tx.systemContactInformation.create({
      data: req.body
    });
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

  await prisma.$transaction(async (tx) => {
    // Get the mapping to find the contact information ID
    const mapping = await tx.systemContactInformation.findUnique({
      where: { id }
    });

    if (!mapping) {
      throw createError(404, 'System contact information mapping not found');
    }

    // Delete the mapping
    await tx.systemContactInformation.delete({
      where: { id }
    });

    // Soft delete the underlying contact information
    await tx.contactInformation.update({
      where: { id: mapping.contactInformationId },
      data: { deleted: true }
    });
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'System contact information mapping deleted successfully'
  };

  res.json(response);
}));

// Person Contact Information Routes
// GET /api/contact-mappings/person/:personId - Get contact information for a specific person
router.get('/person/:displayId', requireAuth, validateDisplayIdParam, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  console.log('displayId', displayId);

  // Get all contact information for this person
  const mappings = await prisma.personContactInformation.findMany({
    where: { person: { displayId }, contactInformation: { deleted: false } },
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
  const item = await prisma.$transaction(async (tx) => {
    // Check if person exists
    const personExists = await tx.person.findFirst({
      where: { id: req.body.personId, deleted: false }
    });

    if (!personExists) {
      throw createError(400, 'Referenced person does not exist');
    }

    // Check if contact information exists
    const contactExists = await tx.contactInformation.findFirst({
      where: { id: req.body.contactInformationId, deleted: false }
    });

    if (!contactExists) {
      throw createError(400, 'Referenced contact information does not exist');
    }

    // Create the mapping
    return await tx.personContactInformation.create({
      data: req.body
    });
  });

  const response: ApiResponse<PersonContactInformation> = {
    success: true,
    data: item,
    message: 'Person contact information mapping created successfully'
  };

  res.status(201).json(response);
}));

// DELETE /api/contact-mappings/person/:displayId/:contactInfoId - Delete person contact information mapping
router.delete('/person/:displayId/:contactInfoId', requireAuth, validateDisplayIdParam, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;
  const contactInfoId = parseInt(req.params.contactInfoId);
  
  if (isNaN(contactInfoId) || contactInfoId <= 0) {
    throw createError(400, 'Invalid contact information ID parameter');
  }

  // Find the mapping to ensure it exists
  const mapping = await prisma.personContactInformation.findFirst({
    where: {
      person: { displayId },
      contactInformation: { id: contactInfoId, deleted: false }
    }
  });

  if (!mapping) {
    throw createError(404, 'Person contact information mapping not found');
  }

  // Soft delete the contact information
  await prisma.contactInformation.update({
    where: { id: contactInfoId },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Person contact information mapping deleted successfully'
  };

  res.json(response);
}));

// Group Contact Information Routes
// GET /api/contact-mappings/group/:groupId - Get contact information for a specific group
router.get('/group/:displayId', requireAuth, validateDisplayIdParam, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  // Get all contact information for this group
  const mappings = await prisma.groupContactInformation.findMany({
    where: { group: { displayId }, contactInformation: { deleted: false } },
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
    where: { displayId: req.body.displayId, deleted: false }
  });

  if (!groupExists) {
    throw createError(400, 'Referenced group does not exist');
  }

  // Check if contact information exists
  const contactExists = await prisma.contactInformation.findFirst({
    where: { id: req.body.contactInfoId, deleted: false }
  });

  if (!contactExists) {
    throw createError(400, 'Referenced contact information does not exist');
  }

  const item = await prisma.groupContactInformation.create({
    data: {
      groupId: groupExists.id,
      contactInformationId: req.body.contactInfoId
    }
  });

  const response: ApiResponse<GroupContactInformation> = {
    success: true,
    data: item,
    message: 'Group contact information mapping created successfully'
  };

  res.status(201).json(response);
}));

// DELETE /api/contact-mappings/group/:displayId/:contactInfoId - Delete group contact information mapping
router.delete('/group/:displayId/:contactInfoId', requireAuth, validateDisplayIdParam, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;
  const contactInfoId = parseInt(req.params.contactInfoId);
  
  if (isNaN(contactInfoId) || contactInfoId <= 0) {
    throw createError(400, 'Invalid contact information ID parameter');
  }

  // Find the mapping to ensure it exists
  const mapping = await prisma.groupContactInformation.findFirst({
    where: {
      group: { displayId },
      contactInformation: { id: contactInfoId, deleted: false }
    }
  });

  if (!mapping) {
    throw createError(404, 'Group contact information mapping not found');
  }

  // Soft delete the contact information
  await prisma.contactInformation.update({
    where: { id: contactInfoId },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Group contact information mapping deleted successfully'
  };

  res.json(response);
}));

export default router;
