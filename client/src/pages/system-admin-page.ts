import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import { setMasquerade } from '../store/slices/masquerade.js';
import { textColors, backgroundColors } from '../utilities/text-colors.js';
import '../components/ui/contact-info-form.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { System, ContactInformation } from '@irl/shared';

@customElement('system-admin-page')
export class SystemAdminPage extends LitElement {
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
  private system: System | null = null;

  @state()
  private name = '';

  @state()
  private description = '';

  @state()
  private registrationOpen = false;

  @state()
  private isLoading = false;

  @state()
  private isSaving = false;

  @state()
  private nameError = '';

  @state()
  private contactInformations: ContactInformation[] = [];

  @state()
  private isExporting = false;

  @state()
  private isImporting = false;

  @state()
  private masqueradeEmail = '';

  @state()
  private isMasquerading = false;

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is system admin
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser?.isSystemAdmin) {
      window.history.pushState({}, '', '/home');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    await this.loadSystem();
  }

  private async loadSystem() {
    this.isLoading = true;
    try {
      const [systemResponse, contactsResponse] = await Promise.all([
        this.api.getSystem(),
        this.api.getSystemContactInformations()
      ]);

      if (systemResponse.success && systemResponse.data) {
        this.system = systemResponse.data;
        this.name = systemResponse.data.name;
        this.description = systemResponse.data.description || '';
        this.registrationOpen = systemResponse.data.registrationOpen;
      }

      if (contactsResponse.success && contactsResponse.data) {
        this.contactInformations = contactsResponse.data;
      }
    } catch (error) {
      // System might not exist yet, which is OK
    } finally {
      this.isLoading = false;
    }
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const { name, value } = target;

    if (name === 'name') {
      this.name = value;
      this.nameError = '';
    } else if (name === 'description') {
      this.description = value;
    } else if (name === 'registrationOpen') {
      this.registrationOpen = (target as HTMLInputElement).checked;
    }
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    // Validate
    if (!this.name.trim()) {
      this.nameError = 'System name is required';
      return;
    }

    this.isSaving = true;

    try {
      const data = {
        name: this.name,
        description: this.description || null,
        registrationOpen: this.registrationOpen
      };

      let response;
      if (this.system) {
        // Update existing system
        response = await this.api.patchSystem(data);
      } else {
        // Create new system
        response = await this.api.createSystem(data);
      }

      if (response.success && response.data) {
        this.system = response.data;
        this.store.dispatch(
          addNotification(
            this.system ? 'System updated successfully' : 'System created successfully',
            'success'
          )
        );
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to save system configuration',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private async handleDelete() {
    if (!this.system) return;

    if (!confirm('Are you sure you want to delete the system configuration? This action cannot be undone.')) {
      return;
    }

    this.isSaving = true;

    try {
      await this.api.deleteSystem();
      this.system = null;
      this.name = '';
      this.description = '';
      this.registrationOpen = false;
      this.store.dispatch(addNotification('System deleted successfully', 'success'));
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to delete system',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private handleBack() {
    window.history.pushState({}, '', '/home');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private async handleExport() {
    this.isExporting = true;
    try {
      await this.api.exportSystem();
      this.store.dispatch(addNotification('System exported successfully', 'success'));
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to export system',
          'error'
        )
      );
    } finally {
      this.isExporting = false;
    }
  }

  private async handleImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!confirm(
      'WARNING: This will replace ALL existing data in the system. This action cannot be undone. Are you absolutely sure you want to continue?'
    )) {
      input.value = '';
      return;
    }

    this.isImporting = true;

    try {
      const response = await this.api.importSystem(file);
      if (response.success) {
        this.store.dispatch(
          addNotification(
            response.message || 'System imported successfully',
            'success'
          )
        );
        // Reload the page to reflect the new data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to import system',
          'error'
        )
      );
    } finally {
      this.isImporting = false;
      input.value = '';
    }
  }

  private async handleMasquerade(e: Event) {
    e.preventDefault();

    if (!this.masqueradeEmail.trim()) {
      this.store.dispatch(addNotification('Please enter an email address', 'error'));
      return;
    }

    this.isMasquerading = true;

    try {
      const response = await this.api.startMasquerade(this.masqueradeEmail.trim());

      if (response.success && response.data) {
        const currentUser = selectCurrentUser(this.store.getState());
        this.store.dispatch(
          setMasquerade({
            originalUserEmail: currentUser?.email || '',
            masqueradeUserEmail: response.data.email
          })
        );

        this.store.dispatch(
          addNotification(
            `Now masquerading as ${response.data.email}`,
            'success'
          )
        );

        // Reload the page to refresh with new user context
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to start masquerade',
          'error'
        )
      );
    } finally {
      this.isMasquerading = false;
    }
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
        <div class="sm:mx-auto sm:w-full sm:max-w-2xl">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl/9 font-bold tracking-tight ${textColors.primary}">
              System Administration
            </h2>
            <button
              @click=${this.handleBack}
              class="text-sm font-semibold ${textColors.link} ${textColors.linkHover}"
            >
              ← Back to Home
            </button>
          </div>

          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            <form @submit=${this.handleSubmit} class="space-y-6">
              <div>
                <label for="name" class="block text-sm/6 font-medium ${textColors.primary}">
                  System Name
                </label>
                <div class="mt-2">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    .value=${this.name}
                    required
                    class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.nameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  ${this.nameError ? html`<p class="mt-1 text-sm ${textColors.error}">${this.nameError}</p>` : ''}
                </div>
              </div>

              <div>
                <label for="description" class="block text-sm/6 font-medium ${textColors.primary}">
                  Description
                </label>
                <div class="mt-2">
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    .value=${this.description}
                    class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    @input=${this.handleInputChange}
                  ></textarea>
                </div>
              </div>

              <div class="relative flex items-start">
                <div class="flex h-6 items-center">
                  <input
                    id="registrationOpen"
                    name="registrationOpen"
                    type="checkbox"
                    .checked=${this.registrationOpen}
                    class="h-4 w-4 rounded ${backgroundColors.border} text-indigo-600 focus:ring-indigo-600"
                    @change=${this.handleInputChange}
                  />
                </div>
                <div class="ml-3 text-sm/6">
                  <label for="registrationOpen" class="font-medium ${textColors.primary}">
                    Registration Open
                  </label>
                  <p class="${textColors.tertiary}">
                    Allow new users to register for the system
                  </p>
                </div>
              </div>

              ${this.system ? html`
                <contact-info-form
                  entityType="system"
                  .entityId=${this.system.id}
                  .contactInformations=${this.contactInformations}
                  @contact-info-changed=${(e: CustomEvent) => {
                    this.contactInformations = e.detail.items;
                  }}
                  @contact-error=${(e: CustomEvent) => {
                    this.store.dispatch(addNotification(e.detail.error, 'error'));
                  }}
                ></contact-info-form>

                <div class="border-t ${backgroundColors.border} pt-6">
                  <h3 class="text-lg font-semibold ${textColors.primary} mb-4">
                    Admin Settings
                  </h3>
                  <div class="space-y-4">
                    <div>
                      <a
                        href="/admin/categories"
                        @click=${(e: Event) => {
                          e.preventDefault();
                          window.history.pushState({}, '', '/admin/categories');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                        class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        Manage Interest Categories
                      </a>
                      <p class="mt-2 text-sm ${textColors.tertiary}">
                        Create, rename, and delete interest categories.
                      </p>
                    </div>
                    <div>
                      <a
                        href="/admin/users"
                        @click=${(e: Event) => {
                          e.preventDefault();
                          window.history.pushState({}, '', '/admin/users');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                        class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        Manage Users
                      </a>
                      <p class="mt-2 text-sm ${textColors.tertiary}">
                        Create, edit, and delete user accounts and manage permissions.
                      </p>
                    </div>
                    <div>
                      <a
                        href="/admin/logs"
                        @click=${(e: Event) => {
                          e.preventDefault();
                          window.history.pushState({}, '', '/admin/logs');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                        class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        View Audit Logs
                      </a>
                      <p class="mt-2 text-sm ${textColors.tertiary}">
                        View all API actions taken by users in the system.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="border-t ${backgroundColors.border} pt-6">
                  <h3 class="text-lg font-semibold ${textColors.primary} mb-4">
                    Data Management
                  </h3>
                  <div class="space-y-4">
                    <div>
                      <button
                        type="button"
                        @click=${this.handleExport}
                        ?disabled=${this.isExporting}
                        class="rounded-md bg-green-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ${this.isExporting
                          ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                          : ''}
                        Export System Data
                      </button>
                      <p class="mt-2 text-sm ${textColors.tertiary}">
                        Download a complete backup of all system data including users, persons, groups, and contact information.
                      </p>
                    </div>

                    <div>
                      <label
                        class="inline-block rounded-md bg-orange-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 cursor-pointer ${this.isImporting ? 'opacity-50 cursor-not-allowed' : ''}"
                      >
                        ${this.isImporting
                          ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                          : ''}
                        Import System Data
                        <input
                          type="file"
                          accept=".json"
                          @change=${this.handleImport}
                          ?disabled=${this.isImporting}
                          class="hidden"
                        />
                      </label>
                      <p class="mt-2 text-sm ${textColors.error} font-semibold">
                        WARNING: Importing will replace ALL existing data. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="border-t ${backgroundColors.border} pt-6">
                  <h3 class="text-lg font-semibold ${textColors.primary} mb-4">
                    Masquerade as User
                  </h3>
                  <form @submit=${this.handleMasquerade} class="space-y-4">
                    <div>
                      <label for="masqueradeEmail" class="block text-sm/6 font-medium ${textColors.primary}">
                        User Email Address
                      </label>
                      <div class="mt-2">
                        <input
                          id="masqueradeEmail"
                          name="masqueradeEmail"
                          type="email"
                          .value=${this.masqueradeEmail}
                          @input=${(e: Event) => {
                            this.masqueradeEmail = (e.target as HTMLInputElement).value;
                          }}
                          placeholder="user@example.com"
                          class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        />
                      </div>
                      <p class="mt-2 text-sm ${textColors.tertiary}">
                        Enter the email address of the user you want to masquerade as. A banner will appear indicating you are in masquerade mode.
                      </p>
                    </div>
                    <button
                      type="submit"
                      ?disabled=${this.isMasquerading}
                      class="rounded-md bg-purple-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ${this.isMasquerading
                        ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                        : ''}
                      Start Masquerading
                    </button>
                  </form>
                </div>
              ` : ''}

              <div class="flex items-center justify-between gap-x-4">
                <button
                  type="submit"
                  ?disabled=${this.isSaving}
                  class="flex justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${this.isSaving
                    ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                    : ''}
                  ${this.system ? 'Update System' : 'Create System'}
                </button>

                ${this.system
                  ? html`
                      <button
                        type="button"
                        @click=${this.handleDelete}
                        ?disabled=${this.isSaving}
                        class="rounded-md bg-red-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete System
                      </button>
                    `
                  : ''}
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'system-admin-page': SystemAdminPage;
  }
}
