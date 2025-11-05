import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { addNotification } from '../store/slices/ui.js';
import { validateEmail } from '../utilities/validation.js';
import { apiClient } from '../services/api-client.js';
import type { AppStore } from '../store/index.js';
import type { User } from '@irl/shared';
import '../components/ui/input.js';
import '../components/ui/button.js';

@customElement('profile-page')
export class ProfilePage extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @state()
  private profile: (User & { pendingEmail?: string }) | null = null;

  @state()
  private isLoading = true;

  // Password change form
  @state()
  private currentPassword = '';

  @state()
  private newPassword = '';

  @state()
  private confirmPassword = '';

  @state()
  private currentPasswordError = '';

  @state()
  private newPasswordError = '';

  @state()
  private confirmPasswordError = '';

  @state()
  private isChangingPassword = false;

  // Email change form
  @state()
  private newEmail = '';

  @state()
  private newEmailError = '';

  @state()
  private emailCurrentPassword = '';

  @state()
  private emailCurrentPasswordError = '';

  @state()
  private isChangingEmail = false;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadProfile();
  }

  private async loadProfile() {
    this.isLoading = true;
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        this.profile = response.data;
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load profile',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  private handlePasswordInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;
    if (name === 'currentPassword') {
      this.currentPassword = value;
      this.currentPasswordError = '';
    } else if (name === 'newPassword') {
      this.newPassword = value;
      this.newPasswordError = '';
    } else if (name === 'confirmPassword') {
      this.confirmPassword = value;
      this.confirmPasswordError = '';
    }
  }

  private async handlePasswordSubmit(e: Event) {
    e.preventDefault();

    // Validate
    this.currentPasswordError = '';
    this.newPasswordError = '';
    this.confirmPasswordError = '';

    if (!this.currentPassword) {
      this.currentPasswordError = 'Current password is required';
    }

    if (!this.newPassword) {
      this.newPasswordError = 'New password is required';
    } else if (this.newPassword.length < 8) {
      this.newPasswordError = 'Password must be at least 8 characters';
    }

    if (this.newPassword !== this.confirmPassword) {
      this.confirmPasswordError = 'Passwords do not match';
    }

    if (this.currentPasswordError || this.newPasswordError || this.confirmPasswordError) {
      return;
    }

    this.isChangingPassword = true;

    try {
      await apiClient.changePassword(this.currentPassword, this.newPassword);
      this.store.dispatch(addNotification('Password updated successfully', 'success'));

      // Reset form
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to update password',
          'error'
        )
      );
    } finally {
      this.isChangingPassword = false;
    }
  }

  private handleEmailInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    if (name === 'newEmail') {
      this.newEmail = value;
      this.newEmailError = '';
    }

    if (name === 'emailCurrentPassword') {
      this.emailCurrentPassword = value;
      this.emailCurrentPasswordError = '';
    }
  }

  private async handleEmailSubmit(e: Event) {
    e.preventDefault();

    // Validate
    this.newEmailError = validateEmail(this.newEmail) || '';
    this.emailCurrentPasswordError = '';

    if (!this.emailCurrentPassword) {
      this.emailCurrentPasswordError = 'Current password is required';
    }

    if (this.newEmailError || this.emailCurrentPasswordError) {
      return;
    }

    this.isChangingEmail = true;

    try {
      await apiClient.changeEmail(this.newEmail, this.emailCurrentPassword);
      this.store.dispatch(
        addNotification(
          'Verification email sent. Please check your new email address.',
          'success'
        )
      );

      // Reset form and reload profile to show pending email
      this.newEmail = '';
      this.emailCurrentPassword = '';
      this.newEmailError = '';
      this.emailCurrentPasswordError = '';
      await this.loadProfile();
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to request email change',
          'error'
        )
      );
    } finally {
      this.isChangingEmail = false;
    }
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="flex justify-center items-center min-h-screen">
          <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
        </div>
      `;
    }

    if (!this.profile) {
      return html`
        <div class="flex justify-center items-center min-h-screen">
          <p class="text-gray-500">Profile not found</p>
        </div>
      `;
    }

    return html`
      <div class="container mx-auto px-4 py-8 max-w-4xl">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <!-- Current Email Display -->
        <div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 mb-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Information</h2>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Email
            </label>
            <p class="text-gray-900 dark:text-white">${this.profile.email}</p>
            ${this.profile.pendingEmail
              ? html`
                <div class="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p class="text-sm text-yellow-800 dark:text-yellow-200">
                    Pending email change to: <strong>${this.profile.pendingEmail}</strong>
                  </p>
                  <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Please check your new email for a verification link.
                  </p>
                </div>
              `
              : ''}
          </div>
        </div>

        <!-- Change Email Form -->
        <div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 mb-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Email</h2>
          <form @submit=${this.handleEmailSubmit} class="space-y-4">
            <div>
              <label for="emailCurrentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <input
                id="emailCurrentPassword"
                name="emailCurrentPassword"
                type="password"
                .value=${this.emailCurrentPassword}
                required
                autocomplete="current-password"
                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-base text-gray-900 dark:text-white outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-500 sm:text-sm ${this.emailCurrentPasswordError ? 'outline-red-500 focus:outline-red-600' : ''}"
                @input=${this.handleEmailInputChange}
              />
              ${this.emailCurrentPasswordError
                ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.emailCurrentPasswordError}</p>`
                : ''}
            </div>
            <div>
              <label for="newEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Email Address
              </label>
              <input
                id="newEmail"
                name="newEmail"
                type="email"
                .value=${this.newEmail}
                required
                autocomplete="email"
                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-base text-gray-900 dark:text-white outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-500 sm:text-sm ${this.newEmailError ? 'outline-red-500 focus:outline-red-600' : ''}"
                @input=${this.handleEmailInputChange}
              />
              ${this.newEmailError
                ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.newEmailError}</p>`
                : ''}
            </div>
            <div>
              <button
                type="submit"
                ?disabled=${this.isChangingEmail}
                class="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ${this.isChangingEmail
                  ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                  : ''}
                Request Email Change
              </button>
            </div>
          </form>
        </div>

        <!-- Change Password Form -->
        <div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
          <form @submit=${this.handlePasswordSubmit} class="space-y-4">
            <div>
              <label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                .value=${this.currentPassword}
                required
                autocomplete="current-password"
                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-base text-gray-900 dark:text-white outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-500 sm:text-sm ${this.currentPasswordError ? 'outline-red-500 focus:outline-red-600' : ''}"
                @input=${this.handlePasswordInputChange}
              />
              ${this.currentPasswordError ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.currentPasswordError}</p>` : ''}
            </div>

            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                .value=${this.newPassword}
                required
                autocomplete="new-password"
                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-base text-gray-900 dark:text-white outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-500 sm:text-sm ${this.newPasswordError ? 'outline-red-500 focus:outline-red-600' : ''}"
                @input=${this.handlePasswordInputChange}
              />
              ${this.newPasswordError ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.newPasswordError}</p>` : ''}
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Must be at least 8 characters</p>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                .value=${this.confirmPassword}
                required
                autocomplete="new-password"
                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-base text-gray-900 dark:text-white outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-500 sm:text-sm ${this.confirmPasswordError ? 'outline-red-500 focus:outline-red-600' : ''}"
                @input=${this.handlePasswordInputChange}
              />
              ${this.confirmPasswordError ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.confirmPasswordError}</p>` : ''}
            </div>

            <div>
              <button
                type="submit"
                ?disabled=${this.isChangingPassword}
                class="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ${this.isChangingPassword
                  ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                  : ''}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-page': ProfilePage;
  }
}
