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
  imageURL: z.string().url('Invalid URL format').optional().nullable(),
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
  groupId: z.number().int('Group ID must be an integer'),
  contactInformationId: z.number().int('Contact Information ID must be an integer')
});

export const personGroupSchema = z.object({
  personId: z.number().int('Person ID must be an integer'),
  groupId: z.number().int('Group ID must be an integer'),
  relation: z.string().min(1, 'Relation is required'),
  isAdmin: z.boolean().optional()
});

export const updatePersonGroupSchema = personGroupSchema.partial();

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