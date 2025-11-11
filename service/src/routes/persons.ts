import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateDisplayIdParam, validateSearchQuery, personSchema, updatePersonSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { canModifyPerson, canCreatePerson } from '../middleware/authorization.js';
import { uploadImageToCloudinary } from '../utils/cloudinary-upload.js';
import type { ApiResponse, PaginatedResponse, Person } from '@irl/shared';
import { geocodeAddress } from '../lib/geocoding.js';
import { Prisma } from '@prisma/client';

const router: ReturnType<typeof Router> = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Helper to format person response
const formatPerson = (person: any): Person => {
  const { deleted, ...personWithoutDeleted } = person;
  void deleted;
  return {
    ...personWithoutDeleted,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString()
  };
};

// GET /api/persons - List all persons (auth required)
router.get('/', requireAuth, validateSearchQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  // Build where clause with search
  const where: any = { deleted: false };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { displayId: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.person.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.person.count({ where })
  ]);

  const response: PaginatedResponse<Person> = {
    success: true,
    data: items.map(formatPerson),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// GET /api/persons/:displayId - Get specific person (auth required)
router.get('/:displayId', requireAuth, validateDisplayIdParam, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  const item = await prisma.person.findFirst({
    where: { displayId, deleted: false }
  });

  if (!item) {
    throw createError(404, 'Person not found');
  }

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item)
  };

  res.json(response);
}));

// POST /api/persons - Create new person (auth required)
router.post('/', requireAuth, canCreatePerson, validateBody(personSchema), asyncHandler(async (req, res) => {
  const item = await prisma.person.create({
    data: req.body
  });

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item),
    message: 'Person created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/persons/:displayId - Update entire person (auth required)
router.put('/:displayId', requireAuth, validateDisplayIdParam, canModifyPerson, validateBody(personSchema), asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  // Check if new displayId already exists (if it's being changed)
  if (req.body.displayId && req.body.displayId !== displayId) {
    const existingPerson = await prisma.person.findFirst({
      where: { displayId: req.body.displayId, deleted: false }
    });

    if (existingPerson) {
      throw createError(400, 'A person with this displayId already exists');
    }
  }

  const item = await prisma.person.update({
    where: { displayId },
    data: req.body
  });

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item),
    message: 'Person updated successfully'
  };

  res.json(response);
}));

// PATCH /api/persons/:displayId - Partial update person (auth required)
router.patch('/:displayId', requireAuth, validateDisplayIdParam, canModifyPerson, validateBody(updatePersonSchema), asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  // Check if new displayId already exists (if it's being changed)
  if (req.body.displayId && req.body.displayId !== displayId) {
    const existingPerson = await prisma.person.findFirst({
      where: { displayId: req.body.displayId, deleted: false }
    });

    if (existingPerson) {
      throw createError(400, 'A person with this displayId already exists');
    }
  }

  const item = await prisma.person.update({
    where: { displayId },
    data: req.body
  });

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(item),
    message: 'Person updated successfully'
  };

  res.json(response);
}));

// DELETE /api/persons/:displayId - Soft delete person (auth required)
router.delete('/:displayId', requireAuth, validateDisplayIdParam, canModifyPerson, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;

  await prisma.person.update({
    where: { displayId },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Person deleted successfully'
  };

  res.json(response);
}));

// POST /api/persons/bulk - Bulk create persons (auth required)
router.post('/bulk', requireAuth, canCreatePerson, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const personsData = req.body.persons;

  // Validate that persons array is provided
  if (!Array.isArray(personsData) || personsData.length === 0) {
    throw createError(400, 'Invalid request: persons array is required and cannot be empty');
  }

  // SECURITY: Validate all persons have userId matching the authenticated user (unless system admin)
  if (!req.user?.isSystemAdmin) {
    const invalidUserIds = personsData.filter(p => p.userId !== userId);
    if (invalidUserIds.length > 0) {
      throw createError(403, 'Forbidden: You can only create persons for yourself');
    }
  }

  // Validate each person meets the schema requirements
  const validationErrors: Array<{ index: number; error: string }> = [];
  personsData.forEach((person, index) => {
    try {
      personSchema.parse(person);
    } catch (error: any) {
      validationErrors.push({
        index,
        error: error.message || 'Validation failed'
      });
    }
  });

  if (validationErrors.length > 0) {
    const errorDetails = validationErrors.map(e => `Row ${e.index}: ${e.error}`).join('; ');
    throw createError(400, `Validation errors: ${errorDetails}`);
  }

  // Check for duplicate displayIds in the batch
  const displayIds = personsData.map(p => p.displayId);
  const duplicatesInBatch = displayIds.filter((id, index) => displayIds.indexOf(id) !== index);
  if (duplicatesInBatch.length > 0) {
    const duplicateList = [...new Set(duplicatesInBatch)].join(', ');
    throw createError(400, `Duplicate displayIds in batch: ${duplicateList}`);
  }

  // Check for existing displayIds in database
  const existingPersons = await prisma.person.findMany({
    where: {
      displayId: { in: displayIds },
      deleted: false
    },
    select: { displayId: true }
  });

  if (existingPersons.length > 0) {
    const existingList = existingPersons.map(p => p.displayId).join(', ');
    throw createError(400, `These displayIds already exist: ${existingList}`);
  }

  // Create all persons with contact information in a transaction
  const createdPersons = await prisma.$transaction(async (tx) => {
    const results: Person[] = [];

    for (const personData of personsData) {
      const { contactInformations, ...personFields } = personData;

      // Create person
      const person = await tx.person.create({
        data: personFields
      });

      // Create contact informations if provided
      if (contactInformations && contactInformations.length > 0) {
        for (const contactInfo of contactInformations) {
          // Geocode address if type is ADDRESS
          let latitude: Prisma.Decimal | undefined;
          let longitude: Prisma.Decimal | undefined;
          
          if (contactInfo.type === 'ADDRESS') {
            const coords = await geocodeAddress(contactInfo.value);
            latitude = new Prisma.Decimal(coords.latitude);
            longitude = new Prisma.Decimal(coords.longitude);
          }
          
          const contact = await tx.contactInformation.create({
            data: {
              ...contactInfo,
              ...(latitude !== undefined && { latitude }),
              ...(longitude !== undefined && { longitude })
            }
          });

          await tx.personContactInformation.create({
            data: {
              personId: person.id,
              contactInformationId: contact.id
            }
          });
        }
      }

      results.push(formatPerson(person));
    }

    return results;
  });

  const response: ApiResponse<Person[]> = {
    success: true,
    data: createdPersons,
    message: `${createdPersons.length} persons created successfully`
  };

  res.status(201).json(response);
}));

// POST /api/persons/:displayId/avatar - Upload avatar image (auth required)
router.post('/:displayId/avatar', requireAuth, validateDisplayIdParam, canModifyPerson, upload.single('avatar'), asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;
  
  if (!req.file) {
    throw createError(400, 'No file uploaded');
  }

  // Check person exists
  const person = await prisma.person.findFirst({
    where: { displayId, deleted: false }
  });

  if (!person) {
    throw createError(404, 'Person not found');
  }

  // Upload to Cloudinary
  const uploadResult = await uploadImageToCloudinary(req.file.buffer);

  // Update person with new image URL
  const updatedPerson = await prisma.person.update({
    where: { displayId },
    data: { imageURL: uploadResult.secureUrl }
  });

  const response: ApiResponse<Person> = {
    success: true,
    data: formatPerson(updatedPerson),
    message: 'Avatar uploaded successfully'
  };

  res.json(response);
}));

export default router;
