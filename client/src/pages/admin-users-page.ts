import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import { textColors, backgroundColors } from '../utilities/text-colors.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { UserWithMetadata } from '@irl/shared';
import '../components/ui/user-list.js';

@customElement('admin-users-page')
export class AdminUsersPage extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @state()
  private users: UserWithMetadata[] = [];

  @state()
  private isLoading = false;

  @state()
  private isSaving = false;

  @state()
  private currentUserId: number | null = null;

  // New user form state
  @state()
  private showNewUserForm = false;

  @state()
  private newUserEmail = '';

  @state()
  private newUserPassword = '';

  @state()
  private newUserIsAdmin = false;

  // Edit user form state
  @state()
  private editingUserId: number | null = null;

  @state()
  private editingUserEmail = '';

  @state()
  private editingUserPassword = '';

  @state()
  private editingUserIsAdmin = false;

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is system admin
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser?.isSystemAdmin) {
      window.history.pushState({}, '', '/home');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    this.currentUserId = currentUser.id;
    await this.loadUsers();
  }

  private async loadUsers() {
    this.isLoading = true;
    try {
      const response = await this.api.getUsers({ limit: 1000 });
      if (response.success && response.data) {
        this.users = response.data;
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load users',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  private handleBack() {
    window.history.pushState({}, '', '/admin/system');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  // New user operations
  private showAddUserForm() {
    this.showNewUserForm = true;
    this.newUserEmail = '';
    this.newUserPassword = '';
    this.newUserIsAdmin = false;
  }

  private cancelNewUser() {
    this.showNewUserForm = false;
    this.newUserEmail = '';
    this.newUserPassword = '';
    this.newUserIsAdmin = false;
  }

  private async createUser() {
    if (!this.newUserEmail.trim() || !this.newUserPassword.trim()) {
      this.store.dispatch(addNotification('Email and password are required', 'error'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newUserEmail.trim())) {
      this.store.dispatch(addNotification('Please enter a valid email address', 'error'));
      return;
    }

    if (this.newUserPassword.length < 8) {
      this.store.dispatch(addNotification('Password must be at least 8 characters', 'error'));
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.createUser({
        email: this.newUserEmail.trim(),
        password: this.newUserPassword,
        isSystemAdmin: this.newUserIsAdmin
      });

      if (response.success) {
        this.store.dispatch(addNotification('User created successfully', 'success'));
        this.showNewUserForm = false;
        this.newUserEmail = '';
        this.newUserPassword = '';
        this.newUserIsAdmin = false;
        await this.loadUsers();
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to create user',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  // Edit user operations
  private handleEditUser(e: CustomEvent) {
    const { userId } = e.detail;
    const user = this.users.find(u => u.id === userId);
    if (user) {
      this.editingUserId = user.id;
      this.editingUserEmail = user.email;
      this.editingUserPassword = ''; // Never populate password
      this.editingUserIsAdmin = user.isSystemAdmin;
    }
  }

  private cancelEditUser() {
    this.editingUserId = null;
    this.editingUserEmail = '';
    this.editingUserPassword = '';
    this.editingUserIsAdmin = false;
  }

  private async saveUser() {
    if (!this.editingUserId || !this.editingUserEmail.trim()) {
      this.store.dispatch(addNotification('Email is required', 'error'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editingUserEmail.trim())) {
      this.store.dispatch(addNotification('Please enter a valid email address', 'error'));
      return;
    }

    // Validate password if provided
    if (this.editingUserPassword && this.editingUserPassword.length < 8) {
      this.store.dispatch(addNotification('Password must be at least 8 characters', 'error'));
      return;
    }

    this.isSaving = true;
    try {
      const updateData: any = {
        email: this.editingUserEmail.trim(),
        isSystemAdmin: this.editingUserIsAdmin
      };

      // Only include password if it was provided
      if (this.editingUserPassword) {
        updateData.password = this.editingUserPassword;
      }

      const response = await this.api.patchUser(this.editingUserId, updateData);

      if (response.success) {
        this.store.dispatch(addNotification('User updated successfully', 'success'));
        this.editingUserId = null;
        this.editingUserEmail = '';
        this.editingUserPassword = '';
        this.editingUserIsAdmin = false;
        await this.loadUsers();
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to update user',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  // Delete user operation
  private async handleDeleteUser(e: CustomEvent) {
    const { user } = e.detail;

    if (user.id === this.currentUserId) {
      this.store.dispatch(addNotification('Cannot delete your own account', 'error'));
      return;
    }

    const confirmMessage = user.personCount > 0
      ? `Are you sure you want to delete user "${user.email}"? This user has ${user.personCount} associated person(s). This action cannot be undone.`
      : `Are you sure you want to delete user "${user.email}"? This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.deleteUser(user.id);

      if (response.success) {
        this.store.dispatch(addNotification('User deleted successfully', 'success'));
        await this.loadUsers();
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to delete user',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private renderNewUserForm() {
    return html`
      <div class="mb-6 p-4 ${backgroundColors.pageAlt} rounded-lg border ${backgroundColors.border}">
        <h3 class="text-sm font-semibold ${textColors.primary} mb-3">Add New User</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium ${textColors.secondary} mb-1">
              Email Address
            </label>
            <input
              type="email"
              .value=${this.newUserEmail}
              @input=${(e: Event) => {
                this.newUserEmail = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  this.createUser();
                } else if (e.key === 'Escape') {
                  this.cancelNewUser();
                }
              }}
              class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
              ?disabled=${this.isSaving}
              placeholder="user@example.com"
              autocomplete="off"
            />
          </div>
          <div>
            <label class="block text-xs font-medium ${textColors.secondary} mb-1">
              Password
            </label>
            <input
              type="password"
              .value=${this.newUserPassword}
              @input=${(e: Event) => {
                this.newUserPassword = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  this.createUser();
                } else if (e.key === 'Escape') {
                  this.cancelNewUser();
                }
              }}
              class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
              ?disabled=${this.isSaving}
              placeholder="Minimum 8 characters"
              autocomplete="new-password"
            />
          </div>
          <div class="relative flex items-start">
            <div class="flex h-6 items-center">
              <input
                id="newUserIsAdmin"
                type="checkbox"
                .checked=${this.newUserIsAdmin}
                @change=${(e: Event) => {
                  this.newUserIsAdmin = (e.target as HTMLInputElement).checked;
                }}
                class="h-4 w-4 rounded ${backgroundColors.border} text-indigo-600 focus:ring-indigo-600"
                ?disabled=${this.isSaving}
              />
            </div>
            <div class="ml-3 text-xs">
              <label for="newUserIsAdmin" class="font-medium ${textColors.primary}">
                System Administrator
              </label>
              <p class="${textColors.tertiary}">
                Grant full system administration privileges
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              @click=${this.createUser}
              ?disabled=${this.isSaving}
              class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create User
            </button>
            <button
              type="button"
              @click=${this.cancelNewUser}
              ?disabled=${this.isSaving}
              class="inline-flex items-center rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm font-semibold ${textColors.primary} ring-1 ring-inset ${backgroundColors.border} hover:${backgroundColors.contentHover} disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderEditUserForm() {
    const user = this.users.find(u => u.id === this.editingUserId);
    if (!user) return html``;

    return html`
      <div class="mb-6 p-4 ${backgroundColors.pageAlt} rounded-lg border ${backgroundColors.border}">
        <h3 class="text-sm font-semibold ${textColors.primary} mb-3">
          Edit User: ${user.email}
        </h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium ${textColors.secondary} mb-1">
              Email Address
            </label>
            <input
              type="email"
              .value=${this.editingUserEmail}
              @input=${(e: Event) => {
                this.editingUserEmail = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  this.saveUser();
                } else if (e.key === 'Escape') {
                  this.cancelEditUser();
                }
              }}
              class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
              ?disabled=${this.isSaving}
              placeholder="user@example.com"
              autocomplete="off"
            />
          </div>
          <div>
            <label class="block text-xs font-medium ${textColors.secondary} mb-1">
              Password
            </label>
            <input
              type="password"
              .value=${this.editingUserPassword}
              @input=${(e: Event) => {
                this.editingUserPassword = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  this.saveUser();
                } else if (e.key === 'Escape') {
                  this.cancelEditUser();
                }
              }}
              class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
              ?disabled=${this.isSaving}
              placeholder="Leave blank to keep current password"
              autocomplete="new-password"
            />
            <p class="mt-1 text-xs ${textColors.tertiary}">
              Leave blank to keep the current password. Minimum 8 characters if changing.
            </p>
          </div>
          <div class="relative flex items-start">
            <div class="flex h-6 items-center">
              <input
                id="editUserIsAdmin"
                type="checkbox"
                .checked=${this.editingUserIsAdmin}
                @change=${(e: Event) => {
                  this.editingUserIsAdmin = (e.target as HTMLInputElement).checked;
                }}
                class="h-4 w-4 rounded ${backgroundColors.border} text-indigo-600 focus:ring-indigo-600"
                ?disabled=${this.isSaving}
              />
            </div>
            <div class="ml-3 text-xs">
              <label for="editUserIsAdmin" class="font-medium ${textColors.primary}">
                System Administrator
              </label>
              <p class="${textColors.tertiary}">
                Grant full system administration privileges
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              @click=${this.saveUser}
              ?disabled=${this.isSaving}
              class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
            <button
              type="button"
              @click=${this.cancelEditUser}
              ?disabled=${this.isSaving}
              class="inline-flex items-center rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm font-semibold ${textColors.primary} ring-1 ring-inset ${backgroundColors.border} hover:${backgroundColors.contentHover} disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="flex min-h-full items-center justify-center py-6 pt-16">
          <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
        </div>
      `;
    }

    return html`
      <div class="flex min-h-full flex-col py-6 sm:px-6 lg:px-8 pt-16">
        <div class="sm:mx-auto sm:w-full sm:max-w-6xl">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl/9 font-bold tracking-tight ${textColors.primary}">
              User Management
            </h2>
            <button
              @click=${this.handleBack}
              class="text-sm font-semibold ${textColors.link} ${textColors.linkHover}"
            >
              ← Back to System Admin
            </button>
          </div>

          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            <div class="flex items-center justify-between mb-6">
              <p class="text-sm ${textColors.tertiary}">
                Manage user accounts, permissions, and credentials. Users can have multiple associated persons.
              </p>
              <button
                type="button"
                @click=${this.showAddUserForm}
                ?disabled=${this.isSaving || this.showNewUserForm || this.editingUserId !== null}
                class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add User
              </button>
            </div>

            ${this.showNewUserForm ? this.renderNewUserForm() : ''}
            ${this.editingUserId !== null ? this.renderEditUserForm() : ''}

            <user-list
              .users=${this.users}
              .currentUserId=${this.currentUserId}
              @edit-user=${this.handleEditUser}
              @delete-user=${this.handleDeleteUser}
            ></user-list>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-users-page': AdminUsersPage;
  }
}
