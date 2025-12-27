// Enums from Prisma schema - must match exactly
export const ContactType = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  ADDRESS: 'ADDRESS',
  URL: 'URL'
} as const;

export const PrivacyLevel = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC'
} as const;

export type ContactType = typeof ContactType[keyof typeof ContactType];
export type PrivacyLevel = typeof PrivacyLevel[keyof typeof PrivacyLevel];

// Base response interface for consistent API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Core model types based on Prisma schema
export interface ContactInformation {
  id: number;
  type: ContactType;
  label: string;
  value: string;
  latitude?: number | null;
  longitude?: number | null;
  privacy: PrivacyLevel;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  isSystemAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  displayId: string;
  pronouns: string | null;
  imageURL: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface System {
  id: number;
  name: string;
  description: string | null;
  registrationOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: number;
  displayId: string;
  name: string;
  description: string | null;
  parentGroupId: number | null;
  allowsAnyUserToCreateSubgroup: boolean;
  publiclyVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: number;
  personId: number;
  requestingUser: number;
  claimCode: string;
  claimed: boolean;
  claimedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupInvite {
  id: number;
  groupId: number;
  email: string;
  createdAt: string;
  updatedAt: string;
  accepted: boolean;
  acceptedAt: string | null;
}

// Junction table types
export interface SystemContactInformation {
  id: number;
  systemId: number;
  contactInformationId: number;
}

export interface PersonContactInformation {
  id: number;
  personId: number;
  contactInformationId: number;
}

export interface GroupContactInformation {
  id: number;
  groupId: number;
  contactInformationId: number;
}

export interface PersonGroup {
  id: number;
  personId: number;
  groupId: number;
  isAdmin: boolean;
}

export interface Interest {
  id: number;
  name: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonInterest {
  id: number;
  personId: number;
  interestId: number;
  level: number;
  createdAt: string;
  updatedAt: string;
}

// Extended types with relations for API responses
export interface PersonGroupWithRelations extends PersonGroup {
  person?: Person;
  group?: Group;
}

export interface PersonInterestWithRelations extends PersonInterest {
  person?: Person;
  interest?: Interest;
}

export interface PersonWithRelations extends Person {
  user?: User;
  contactInformation?: ContactInformation[];
  groupMemberships?: PersonGroup[];
  claims?: Claim[];
  interests?: PersonInterest[];
}

export interface GroupWithRelations extends Group {
  parentGroup?: Group;
  childGroups?: Group[];
  people?: PersonGroup[];
  contactInformation?: ContactInformation[];
  invites?: GroupInvite[];
}

export interface SystemWithRelations extends System {
  contactInformation?: ContactInformation[];
}

export interface UserWithRelations extends User {
  people?: Person[];
  claims?: Claim[];
}

export interface ClaimWithRelations extends Claim {
  person?: Person;
  user?: User;
}

export interface GroupInviteWithRelations extends GroupInvite {
  group?: Group;
}

// Create/Update request types (excluding readonly fields)
export interface CreateContactInformationRequest {
  type: ContactType;
  label: string;
  value: string;
  privacy: PrivacyLevel;
}

export interface UpdateContactInformationRequest {
  type?: ContactType;
  label?: string;
  value?: string;
  privacy?: PrivacyLevel;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  isSystemAdmin?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  isSystemAdmin?: boolean;
}

export interface CreatePersonRequest {
  firstName: string;
  lastName: string;
  displayId: string;
  pronouns?: string | null;
  imageURL?: string | null;
  userId: number;
}

export interface UpdatePersonRequest {
  firstName?: string;
  lastName?: string;
  displayId?: string;
  pronouns?: string | null;
  imageURL?: string | null;
  userId?: number;
}

export interface CreateSystemRequest {
  name: string;
  description?: string | null;
  registrationOpen?: boolean;
}

export interface UpdateSystemRequest {
  name?: string;
  description?: string | null;
  registrationOpen?: boolean;
}

export interface CreateGroupRequest {
  displayId: string;
  name: string;
  description?: string | null;
  parentGroupId?: number | null;
  parentGroupDisplayId?: string | null;
  allowsAnyUserToCreateSubgroup?: boolean;
  publiclyVisible?: boolean;
}

export interface UpdateGroupRequest {
  displayId?: string;
  name?: string;
  description?: string | null;
  parentGroupId?: number | null;
  allowsAnyUserToCreateSubgroup?: boolean;
  publiclyVisible?: boolean;
}

export interface CreateClaimRequest {
  personId: number;
  requestingUser: number;
  claimCode: string;
  expiresAt: string;
}

export interface UpdateClaimRequest {
  personId?: number;
  requestingUser?: number;
  claimCode?: string;
  claimed?: boolean;
  claimedAt?: string | null;
  expiresAt?: string;
}

export interface CreateGroupInviteRequest {
  groupId: number;
  email: string;
}

export interface UpdateGroupInviteRequest {
  groupId?: number;
  email?: string;
  accepted?: boolean;
  acceptedAt?: string | null;
}

// Junction table create/update types
export interface CreateSystemContactInformationRequest {
  systemId: number;
  contactInformationId: number;
}

export interface CreatePersonContactInformationRequest {
  personId: number;
  contactInformationId: number;
}

export interface CreateGroupContactInformationRequest {
  groupId: number;
  contactInformationId: number;
}

export interface CreatePersonGroupRequest {
  personId: number;
  groupId: number;
  isAdmin?: boolean;
}

export interface UpdatePersonGroupRequest {
  personId?: number;
  groupId?: number;
  isAdmin?: boolean;
}

export interface CreateInterestRequest {
  name: string;
  category: string;
}

export interface PersonInterestItem {
  interestId: number;
  level: number;
}

export interface SetPersonInterestsRequest {
  interests: PersonInterestItem[];
}

// System export/import types
export interface SystemExportData {
  version: string;
  exportedAt: string;
  system: System | null;
  users: Omit<User, 'password'>[];
  persons: Person[];
  groups: Group[];
  contactInformations: ContactInformation[];
  systemContactInformations: SystemContactInformation[];
  personContactInformations: PersonContactInformation[];
  groupContactInformations: GroupContactInformation[];
  personGroups: PersonGroup[];
}