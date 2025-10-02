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
  CreateGroupContactInformationRequest
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

  // Person endpoints
  async getPersons(params?: PaginationParams): Promise<PaginatedResponse<Person>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<Person>>(`/persons${queryString}`);
  }

  async getPerson(id: number): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>(`/persons/${id}`);
  }

  async createPerson(data: CreatePersonRequest): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>('/persons', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePerson(id: number, data: CreatePersonRequest): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>(`/persons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchPerson(id: number, data: UpdatePersonRequest): Promise<ApiResponse<Person>> {
    return this.request<ApiResponse<Person>>(`/persons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deletePerson(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/persons/${id}`, {
      method: 'DELETE'
    });
  }

  // Group endpoints
  async getGroups(params?: PaginationParams): Promise<PaginatedResponse<Group>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<Group>>(`/groups${queryString}`);
  }

  async getGroup(id: number): Promise<ApiResponse<Group>> {
    return this.request<ApiResponse<Group>>(`/groups/${id}`);
  }

  async createGroup(data: CreateGroupRequest): Promise<ApiResponse<Group>> {
    return this.request<ApiResponse<Group>>('/groups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateGroup(id: number, data: CreateGroupRequest): Promise<ApiResponse<Group>> {
    return this.request<ApiResponse<Group>>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patchGroup(id: number, data: UpdateGroupRequest): Promise<ApiResponse<Group>> {
    return this.request<ApiResponse<Group>>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteGroup(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/groups/${id}`, {
      method: 'DELETE'
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

  // Contact mapping endpoints - System
  async getSystemContactInformation(params?: PaginationParams): Promise<PaginatedResponse<SystemContactInformation>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<SystemContactInformation>>(`/contact-mappings/system${queryString}`);
  }

  async createSystemContactInformation(data: CreateSystemContactInformationRequest): Promise<ApiResponse<SystemContactInformation>> {
    return this.request<ApiResponse<SystemContactInformation>>('/contact-mappings/system', {
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
  async getPersonContactInformation(params?: PaginationParams): Promise<PaginatedResponse<PersonContactInformation>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<PersonContactInformation>>(`/contact-mappings/person${queryString}`);
  }

  async createPersonContactInformation(data: CreatePersonContactInformationRequest): Promise<ApiResponse<PersonContactInformation>> {
    return this.request<ApiResponse<PersonContactInformation>>('/contact-mappings/person', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deletePersonContactInformation(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/contact-mappings/person/${id}`, {
      method: 'DELETE'
    });
  }

  // Contact mapping endpoints - Group
  async getGroupContactInformation(params?: PaginationParams): Promise<PaginatedResponse<GroupContactInformation>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return this.request<PaginatedResponse<GroupContactInformation>>(`/contact-mappings/group${queryString}`);
  }

  async createGroupContactInformation(data: CreateGroupContactInformationRequest): Promise<ApiResponse<GroupContactInformation>> {
    return this.request<ApiResponse<GroupContactInformation>>('/contact-mappings/group', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteGroupContactInformation(id: number): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(`/contact-mappings/group/${id}`, {
      method: 'DELETE'
    });
  }
}

// Export a default instance
export const apiClient = new ApiClient();
