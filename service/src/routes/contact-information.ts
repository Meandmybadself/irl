import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, contactInformationSchema, updateContactInformationSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, PaginatedResponse, ContactInformation } from '@irl/shared';
import { geocodeAddress } from '../lib/geocoding.js';
import { Prisma } from '@prisma/client';

const router: ReturnType<typeof Router> = Router();

// GET /api/contact-information - List all contact information
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.contactInformation.findMany({
      where: { deleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.contactInformation.count({ where: { deleted: false } })
  ]);

  const response: PaginatedResponse<ContactInformation> = {
    success: true,
    data: items.map(item => ({
      ...item,
      latitude: item.latitude != null ? parseFloat(item.latitude.toString()) : null,
      longitude: item.longitude != null ? parseFloat(item.longitude.toString()) : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/contact-information/:id - Get specific contact information
router.get('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  const item = await prisma.contactInformation.findFirst({
    where: { id, deleted: false }
  });

  if (!item) {
    throw createError(404, 'Contact information not found');
  }

  const response: ApiResponse<ContactInformation> = {
    success: true,
    data: {
      ...item,
      latitude: item.latitude != null ? parseFloat(item.latitude.toString()) : null,
      longitude: item.longitude != null ? parseFloat(item.longitude.toString()) : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }
  };

  res.json(response);
}));

// POST /api/contact-information - Create new contact information
router.post('/', requireAuth, validateBody(contactInformationSchema), asyncHandler(async (req, res) => {
  const { type, value, ...rest } = req.body;
  
  // Geocode address if type is ADDRESS
  let latitude: Prisma.Decimal | undefined;
  let longitude: Prisma.Decimal | undefined;
  
  if (type === 'ADDRESS') {
    const coords = await geocodeAddress(value);
    latitude = new Prisma.Decimal(coords.latitude);
    longitude = new Prisma.Decimal(coords.longitude);
  }
  
  const item = await prisma.contactInformation.create({
    data: {
      type,
      value,
      ...rest,
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude })
    }
  });

  const response: ApiResponse<ContactInformation> = {
    success: true,
    data: {
      ...item,
      latitude: item.latitude != null ? parseFloat(item.latitude.toString()) : null,
      longitude: item.longitude != null ? parseFloat(item.longitude.toString()) : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    },
    message: 'Contact information created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/contact-information/:id - Update entire contact information
router.put('/:id', requireAuth, validateIdParam, validateBody(contactInformationSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { type, value, ...rest } = req.body;
  
  // Geocode address if type is ADDRESS
  let latitude: Prisma.Decimal | undefined;
  let longitude: Prisma.Decimal | undefined;
  
  if (type === 'ADDRESS') {
    const coords = await geocodeAddress(value);
    latitude = new Prisma.Decimal(coords.latitude);
    longitude = new Prisma.Decimal(coords.longitude);
  }

  const item = await prisma.contactInformation.update({
    where: { id },
    data: {
      type,
      value,
      ...rest,
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude })
    }
  });

  const response: ApiResponse<ContactInformation> = {
    success: true,
    data: {
      ...item,
      latitude: item.latitude != null ? parseFloat(item.latitude.toString()) : null,
      longitude: item.longitude != null ? parseFloat(item.longitude.toString()) : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    },
    message: 'Contact information updated successfully'
  };

  res.json(response);
}));

// PATCH /api/contact-information/:id - Partial update contact information
router.patch('/:id', requireAuth, validateIdParam, validateBody(updateContactInformationSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { type, value, ...rest } = req.body;
  
  // Get existing contact information to check type
  const existing = await prisma.contactInformation.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, 'Contact information not found');
  }
  
  // Determine if we need to geocode
  const finalType = type || existing.type;
  const finalValue = value || existing.value;
  
  let latitude: Prisma.Decimal | undefined;
  let longitude: Prisma.Decimal | undefined;
  
  // Geocode if type is ADDRESS and value is being updated
  if (finalType === 'ADDRESS' && value) {
    const coords = await geocodeAddress(finalValue);
    latitude = new Prisma.Decimal(coords.latitude);
    longitude = new Prisma.Decimal(coords.longitude);
  }

  const item = await prisma.contactInformation.update({
    where: { id },
    data: {
      ...(type && { type }),
      ...(value && { value }),
      ...rest,
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude })
    }
  });

  const response: ApiResponse<ContactInformation> = {
    success: true,
    data: {
      ...item,
      latitude: item.latitude != null ? parseFloat(item.latitude.toString()) : null,
      longitude: item.longitude != null ? parseFloat(item.longitude.toString()) : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    },
    message: 'Contact information updated successfully'
  };

  res.json(response);
}));

// DELETE /api/contact-information/:id - Soft delete contact information
router.delete('/:id', requireAuth, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.contactInformation.update({
    where: { id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Contact information deleted successfully'
  };

  res.json(response);
}));

export default router;
