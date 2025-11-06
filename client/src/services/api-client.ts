import type {
  ApiResponse,
  PaginatedResponse,
  System,
  CreateSystemRequest,
  UpdateSystemRequest,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Person,
  CreatePersonRequest,
  UpdatePersonRequest,
  Group,
  CreateGroupRequest,
  UpdateGroupRequest,
  ContactInformation,
  CreateContactInformationRequest,
  UpdateContactInformationRequest,
  Claim,
  CreateClaimRequest,
  UpdateClaimRequest,
  GroupInvite,
  CreateGroupInviteRequest,
  UpdateGroupInviteRequest,
  PersonGroup,
  CreatePersonGroupRequest,
  UpdatePersonGroupRequest,
  SystemContactInformation,
  CreateSystemContactInformationRequest,
  PersonContactInformation,
  CreatePersonContactInformationRequest,
  GroupContactInformation,
  CreateGroupContactInformationRequest,
  PersonGroupWithRelations
} from '@irl/shared';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: response.statusText
      }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // System endpoints
  async getSystem(): Promise<ApiResponse<System>> {
    return this.request<ApiResponse<System>>('/system');
  }

  async createSystem(data: CreateSystemRequest): Promise<ApiResponse<System>> {
    return this.request<ApiResponse<System>>('/system', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSystem(data: CreateSystemRequest): Promise<ApiResponse<System>> {
    return this.request<ApiResponse<System>>('/system', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchSystem(data: UpdateSystemRequest): Promise<ApiResponse<System>> {
    return this.request<ApiResponse<System>>('/system', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteSystem(): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>('/system', {
      method: 'DELETE'
    });
  }

  // User endpoints
  async getUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<User>>(`/users${queryString}`);
  }

  async getUser(id: number): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>(`/users/${id}`);
  }

  async verifyUser(token: string): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>(`/users/verify?token=${encodeURIComponent(token)}`);
  }

  async createUser(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateUser(id: number, data: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchUser(id: number, data: UpdateUserRequest): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteUser(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/users/${id}`, {
      method: 'DELETE'
    });
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; person: Person }>> {
    return this.request<ApiResponse<{ user: User; person: Person }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async logout(): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>('/auth/logout', {
      method: 'POST'
    });
  }

  async getCurrentSession(): Promise<ApiResponse<{ user: User; person: Person }>> {
    return this.request<ApiResponse<{ user: User; person: Person }>>('/auth/session');
  }

  async resendVerification(email: string): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Person endpoints
  async getPersons(params?: PaginationParams): Promise<PaginatedResponse<Person>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<Person>>(`/persons${queryString}`);
  }

  async getPerson(displayId: string): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>(`/persons/${displayId}`);
  }

  async createPerson(data: CreatePersonRequest): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>('/persons', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePerson(displayId: string, data: CreatePersonRequest): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>(`/persons/${displayId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchPerson(displayId: string, data: UpdatePersonRequest): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>(`/persons/${displayId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deletePerson(displayId: string): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/persons/${displayId}`, {
      method: 'DELETE'
    });
  }

  async bulkCreatePersons(data: Array<CreatePersonRequest & { contactInformations?: Omit<ContactInformation, 'id' | 'createdAt' | 'updatedAt'>[] }>): Promise<ApiResponse<Array<{ success: boolean; data?: Person; error?: string; displayId: string }>>> {
    return this.request(`/persons/bulk`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Group endpoints
  async getGroups(page?: number, limit?: number, search?: string): Promise<PaginatedResponse<Group>> {
    const query = new URLSearchParams();
    if (page) query.set('page', page.toString());
    if (limit) query.set('limit', limit.toString());
    if (search) query.set('search', search);
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<Group>>(`/groups${queryString}`);
  }

  async getGroup(displayId: string): Promise<ApiResponse<Group>> {
    return this.request<ApiResponse<Group>>(`/groups/${displayId}`);
  }

  async createGroup(data: CreateGroupRequest): Promise<ApiResponse<Group>> {
    return this.request<ApiResponse<Group>>('/groups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateGroup(displayId: string, data: CreateGroupRequest): Promise<ApiResponse<Group>> {
    return this.request<ApiResponse<Group>>(`/groups/${displayId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchGroup(displayId: string, data: UpdateGroupRequest): Promise<ApiResponse<Group>> {
    return this.request<ApiResponse<Group>>(`/groups/${displayId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteGroup(displayId: string): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/groups/${displayId}`, {
      method: 'DELETE'
    });
  }

  async bulkCreateGroups(data: Array<CreateGroupRequest & { contactInformations?: Omit<ContactInformation, 'id' | 'createdAt' | 'updatedAt'>[] }>): Promise<ApiResponse<Array<{ success: boolean; data?: Group; error?: string; displayId: string }>>> {
    return this.request(`/groups/bulk`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ContactInformation endpoints
  async getContactInformation(params?: PaginationParams): Promise<PaginatedResponse<ContactInformation>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<ContactInformation>>(`/contact-information${queryString}`);
  }

  async getContactInformationById(id: number): Promise<ApiResponse<ContactInformation>> {
    return this.request<ApiResponse<ContactInformation>>(`/contact-information/${id}`);
  }

  async createContactInformation(data: CreateContactInformationRequest): Promise<ApiResponse<ContactInformation>> {
    return this.request<ApiResponse<ContactInformation>>('/contact-information', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateContactInformation(id: number, data: CreateContactInformationRequest): Promise<ApiResponse<ContactInformation>> {
    return this.request<ApiResponse<ContactInformation>>(`/contact-information/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchContactInformation(id: number, data: UpdateContactInformationRequest): Promise<ApiResponse<ContactInformation>> {
    return this.request<ApiResponse<ContactInformation>>(`/contact-information/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteContactInformation(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/contact-information/${id}`, {
      method: 'DELETE'
    });
  }

  // Claim endpoints
  async getClaims(params?: PaginationParams): Promise<PaginatedResponse<Claim>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<Claim>>(`/claims${queryString}`);
  }

  async getClaim(id: number): Promise<ApiResponse<Claim>> {
    return this.request<ApiResponse<Claim>>(`/claims/${id}`);
  }

  async createClaim(data: CreateClaimRequest): Promise<ApiResponse<Claim>> {
    return this.request<ApiResponse<Claim>>('/claims', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateClaim(id: number, data: CreateClaimRequest): Promise<ApiResponse<Claim>> {
    return this.request<ApiResponse<Claim>>(`/claims/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchClaim(id: number, data: UpdateClaimRequest): Promise<ApiResponse<Claim>> {
    return this.request<ApiResponse<Claim>>(`/claims/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteClaim(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/claims/${id}`, {
      method: 'DELETE'
    });
  }

  // GroupInvite endpoints
  async getGroupInvites(params?: PaginationParams): Promise<PaginatedResponse<GroupInvite>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<GroupInvite>>(`/group-invites${queryString}`);
  }

  async getGroupInvite(id: number): Promise<ApiResponse<GroupInvite>> {
    return this.request<ApiResponse<GroupInvite>>(`/group-invites/${id}`);
  }

  async createGroupInvite(data: CreateGroupInviteRequest): Promise<ApiResponse<GroupInvite>> {
    return this.request<ApiResponse<GroupInvite>>('/group-invites', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateGroupInvite(id: number, data: CreateGroupInviteRequest): Promise<ApiResponse<GroupInvite>> {
    return this.request<ApiResponse<GroupInvite>>(`/group-invites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchGroupInvite(id: number, data: UpdateGroupInviteRequest): Promise<ApiResponse<GroupInvite>> {
    return this.request<ApiResponse<GroupInvite>>(`/group-invites/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteGroupInvite(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/group-invites/${id}`, {
      method: 'DELETE'
    });
  }

  // PersonGroup endpoints
  async getPersonGroups(params?: PaginationParams): Promise<PaginatedResponse<PersonGroup>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<PersonGroup>>(`/person-groups${queryString}`);
  }

  async getPersonGroup(id: number): Promise<ApiResponse<PersonGroup>> {
    return this.request<ApiResponse<PersonGroup>>(`/person-groups/${id}`);
  }

  async createPersonGroup(data: CreatePersonGroupRequest): Promise<ApiResponse<PersonGroup>> {
    return this.request<ApiResponse<PersonGroup>>('/person-groups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePersonGroup(id: number, data: CreatePersonGroupRequest): Promise<ApiResponse<PersonGroup>> {
    return this.request<ApiResponse<PersonGroup>>(`/person-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchPersonGroup(id: number, data: UpdatePersonGroupRequest): Promise<ApiResponse<PersonGroup>> {
    return this.request<ApiResponse<PersonGroup>>(`/person-groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deletePersonGroup(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/person-groups/${id}`, {
      method: 'DELETE'
    });
  }

  async getPersonGroupsByPerson(displayId: string): Promise<ApiResponse<PersonGroupWithRelations[]>> {
    return this.request<ApiResponse<PersonGroupWithRelations[]>>(`/person-groups/by-person/${displayId}`);
  }

  async getPersonGroupsByGroup(displayId: string): Promise<ApiResponse<PersonGroupWithRelations[]>> {
    return this.request<ApiResponse<PersonGroupWithRelations[]>>(`/person-groups/by-group/${displayId}`);
  }

  // Contact mapping endpoints - System
  async getSystemContactInformations(): Promise<ApiResponse<ContactInformation[]>> {
    return this.request<ApiResponse<ContactInformation[]>>('/contact-mappings/system');
  }

  async createSystemContactInformation(data: CreateSystemContactInformationRequest): Promise<ApiResponse<SystemContactInformation>> {
    return this.request<ApiResponse<SystemContactInformation>>('/contact-mappings/system', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createSystemContactInformationWithContact(data: CreateContactInformationRequest & { systemId: number }): Promise<ApiResponse<ContactInformation>> {
    return this.request<ApiResponse<ContactInformation>>('/contact-mappings/system/with-contact', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteSystemContactInformation(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/contact-mappings/system/${id}`, {
      method: 'DELETE'
    });
  }

  // Contact mapping endpoints - Person
  async getPersonContactInformations(displayId: string): Promise<ApiResponse<ContactInformation[]>> {
    return this.request<ApiResponse<ContactInformation[]>>(`/contact-mappings/person/${displayId}`);
  }

  async createPersonContactInformation(data: CreatePersonContactInformationRequest): Promise<ApiResponse<PersonContactInformation>> {
    return this.request<ApiResponse<PersonContactInformation>>('/contact-mappings/person', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createPersonContactInformationWithContact(data: CreateContactInformationRequest & { personId: number }): Promise<ApiResponse<ContactInformation>> {
    return this.request<ApiResponse<ContactInformation>>('/contact-mappings/person/with-contact', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deletePersonContactInformation(displayId: string, contactInfoId: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/contact-mappings/person/${displayId}/${contactInfoId}`, {
      method: 'DELETE'
    });
  }

  // Contact mapping endpoints - Group
  async getGroupContactInformations(displayId: string): Promise<ApiResponse<ContactInformation[]>> {
    return this.request<ApiResponse<ContactInformation[]>>(`/contact-mappings/group/${displayId}`);
  }

  async createGroupContactInformation(data: CreateGroupContactInformationRequest): Promise<ApiResponse<GroupContactInformation>> {
    return this.request<ApiResponse<GroupContactInformation>>('/contact-mappings/group', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createGroupContactInformationWithContact(data: CreateContactInformationRequest & { groupId: number }): Promise<ApiResponse<ContactInformation>> {
    return this.request<ApiResponse<ContactInformation>>('/contact-mappings/group/with-contact', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteGroupContactInformation(displayId: string, contactInfoId: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/contact-mappings/group/${displayId}/${contactInfoId}`, {
      method: 'DELETE'
    });
  }

  // Profile endpoints
  async getProfile(): Promise<ApiResponse<User & { pendingEmail?: string }>> {
    return this.request<ApiResponse<User & { pendingEmail?: string }>>('/users/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>('/users/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  async changeEmail(newEmail: string, currentPassword: string): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>('/users/me/email', {
      method: 'POST',
      body: JSON.stringify({ newEmail, currentPassword })
    });
  }

  async verifyEmailChange(token: string): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>(`/users/verify-email-change?token=${token}`);
  }
}

// Export a default instance
export const apiClient = new ApiClient();
