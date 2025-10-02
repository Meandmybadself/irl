import { schema } from 'normalizr';

// Define entity schemas
export const userSchema = new schema.Entity('users');
export const personSchema = new schema.Entity('persons');
export const groupSchema = new schema.Entity('groups');
export const contactInformationSchema = new schema.Entity('contactInformation');
export const systemSchema = new schema.Entity('system');

// Define relationships
personSchema.define({
  userId: userSchema
});

// Auth response schema
export const authResponseSchema = {
  user: userSchema,
  person: personSchema
};
