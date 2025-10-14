import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
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
  private registrationOpen = false;

  @state()
  private isLoading = false;

  @state()
  private isSaving = false;

  @state()
  private nameError = '';

  @state()
  private contactInformations: ContactInformation[] = [];

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
      const response = await this.api.getSystem();
      if (response.success && response.data) {
        this.system = response.data;
        this.name = response.data.name;
        this.registrationOpen = response.data.registrationOpen;

        // TODO: Load contact information when backend endpoint is available
        // For now, contact information starts empty
        this.contactInformations = [];
      }
    } catch (error) {
      // System might not exist yet, which is OK
      console.log('No system configured yet');
    } finally {
      this.isLoading = false;
    }
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    if (name === 'name') {
      this.name = value;
      this.nameError = '';
    } else if (name === 'registrationOpen') {
      this.registrationOpen = type === 'checkbox' ? checked : value === 'true';
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

  render() {
    if (this.isLoading) {
      return html`
        <div class="flex min-h-full items-center justify-center py-12 pt-20">
          <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
        </div>
      `;
    }

    return html`
      <div class="flex min-h-full flex-col py-12 sm:px-6 lg:px-8 pt-20">
        <div class="sm:mx-auto sm:w-full sm:max-w-2xl">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl/9 font-bold tracking-tight text-gray-900">
              System Administration
            </h2>
            <button
              @click=${this.handleBack}
              class="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              ← Back to Home
            </button>
          </div>

          <div class="bg-white px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            ${this.system
              ? html`
                  <div class="mb-6 rounded-md bg-blue-50 p-4">
                    <div class="flex">
                      <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
                        </svg>
                      </div>
                      <div class="ml-3 flex-1">
                        <p class="text-sm text-blue-700">
                          System ID: ${this.system.id} | Created: ${new Date(this.system.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                `
              : ''}

            <form @submit=${this.handleSubmit} class="space-y-6">
              <div>
                <label for="name" class="block text-sm/6 font-medium text-gray-900">
                  System Name
                </label>
                <div class="mt-2">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    .value=${this.name}
                    required
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.nameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  ${this.nameError ? html`<p class="mt-1 text-sm text-red-600">${this.nameError}</p>` : ''}
                </div>
              </div>

              <div class="relative flex items-start">
                <div class="flex h-6 items-center">
                  <input
                    id="registrationOpen"
                    name="registrationOpen"
                    type="checkbox"
                    .checked=${this.registrationOpen}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    @change=${this.handleInputChange}
                  />
                </div>
                <div class="ml-3 text-sm/6">
                  <label for="registrationOpen" class="font-medium text-gray-900">
                    Registration Open
                  </label>
                  <p class="text-gray-500">
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
