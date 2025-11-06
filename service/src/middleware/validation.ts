import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Zod schemas for validation
export const contactInformationSchema = z.object({
  type: z.enum(['EMAIL', 'PHONE', 'ADDRESS', 'URL'] as const),
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required'),
  privacy: z.enum(['PRIVATE', 'PUBLIC'] as const)
});

export const updateContactInformationSchema = contactInformationSchema.partial();

export const systemContactInformationWithContactSchema = contactInformationSchema.extend({
  systemId: z.number().int('System ID must be an integer')
});

export const personContactInformationWithContactSchema = contactInformationSchema.extend({
  personId: z.number().int('Person ID must be an integer')
});

export const groupContactInformationWithContactSchema = contactInformationSchema.extend({
  groupId: z.number().int('Group ID must be an integer')
});

export const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  isSystemAdmin: z.boolean().optional()
});

export const updateUserSchema = userSchema.partial();

export const personSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  displayId: z.string().min(1, 'Display ID is required'),
  pronouns: z.string().optional().nullable(),
  imageURL: z.string().url().refine(
    url => url.startsWith('http://') || url.startsWith('https://'),
    'URL must use HTTP or HTTPS protocol'
  ).optional().nullable(),
  userId: z.number().int('User ID must be an integer')
});

export const updatePersonSchema = personSchema.partial();

export const systemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  registrationOpen: z.boolean().optional()
});

export const updateSystemSchema = systemSchema.partial();

export const groupSchema = z.object({
  displayId: z.string().min(1, 'Display ID is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  parentGroupId: z.number().int('Parent Group ID must be an integer').optional().nullable(),
  allowsAnyUserToCreateSubgroup: z.boolean().optional(),
  publiclyVisible: z.boolean().optional()
});

export const updateGroupSchema = groupSchema.partial();

export const claimSchema = z.object({
  personId: z.number().int('Person ID must be an integer'),
  requestingUser: z.number().int('Requesting User must be an integer'),
  claimCode: z.string().min(1, 'Claim code is required'),
  expiresAt: z.string().datetime('Invalid date format for expiresAt')
});

export const updateClaimSchema = claimSchema.partial().extend({
  claimed: z.boolean().optional(),
  claimedAt: z.string().datetime('Invalid date format for claimedAt').optional().nullable()
});

export const groupInviteSchema = z.object({
  groupId: z.number().int('Group ID must be an integer'),
  email: z.string().email('Invalid email format')
});

export const updateGroupInviteSchema = groupInviteSchema.partial().extend({
  accepted: z.boolean().optional(),
  acceptedAt: z.string().datetime('Invalid date format for acceptedAt').optional().nullable()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

export const changeEmailSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newEmail: z.string().email('Invalid email format')
});

// Junction table schemas
export const systemContactInformationSchema = z.object({
  systemId: z.number().int('System ID must be an integer'),
  contactInformationId: z.number().int('Contact Information ID must be an integer')
});

export const personContactInformationSchema = z.object({
  personId: z.number().int('Person ID must be an integer'),
  contactInformationId: z.number().int('Contact Information ID must be an integer')
});

export const groupContactInformationSchema = z.object({
  displayId: z.string().min(1, 'Display ID is required'),
  contactInformationId: z.number().int('Contact Information ID must be an integer')
});

export const personGroupSchema = z.object({
  personId: z.number().int('Person ID must be an integer'),
  groupId: z.number().int('Group ID must be an integer'),
  isAdmin: z.boolean().optional()
});

export const updatePersonGroupSchema = personGroupSchema.partial();

// Bulk import schemas
export const bulkPersonSchema = personSchema.extend({
  contactInformations: z.array(contactInformationSchema).optional()
});

export const bulkPersonsSchema = z.array(bulkPersonSchema).min(1, 'At least one person is required');

export const bulkGroupSchema = groupSchema.extend({
  contactInformations: z.array(contactInformationSchema).optional()
});

export const bulkGroupsSchema = z.array(bulkGroupSchema).min(1, 'At least one group is required');

// Validation middleware factory
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Search query schema with sanitization
export const searchQuerySchema = z.string()
  .max(100, 'Search query must not exceed 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_@.]*$/, 'Search query contains invalid characters')
  .transform(str => str.trim())
  .optional();

// ID parameter validation
export const validateIdParam = (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid ID parameter',
      message: 'ID must be a positive integer'
    });
    return;
  }
  req.params.id = id.toString();
  next();
};

// Display ID parameter validation
export const validateDisplayIdParam = (req: Request, res: Response, next: NextFunction) => {
  const displayId = req.params.displayId;
  if (!displayId || typeof displayId !== 'string' || displayId.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid displayId parameter',
      message: 'displayId must be a non-empty string'
    });
    return;
  }
  next();
};

// Search query validation middleware
export const validateSearchQuery = (req: Request, res: Response, next: NextFunction) => {
  if (req.query.search) {
    try {
      const validated = searchQuerySchema.parse(req.query.search);
      req.query.search = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid search query',
          message: error.errors[0]?.message || 'Search query validation failed'
        });
        return;
      }
      next(error);
    }
  } else {
    next();
  }
};
