import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectIsAuthenticated } from '../store/selectors.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';

@customElement('create-group-page')
export class CreateGroupPage extends LitElement {
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
  private name = '';

  @state()
  private displayId = '';

  @state()
  private description = '';

  @state()
  private publiclyVisible = true;

  @state()
  private allowsAnyUserToCreateSubgroup = false;

  @state()
  private nameError = '';

  @state()
  private displayIdError = '';

  @state()
  private isSaving = false;

  connectedCallback() {
    super.connectedCallback();

    // Check if user is authenticated
    const isAuthenticated = selectIsAuthenticated(this.store.getState());
    if (!isAuthenticated) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const { name, value, type } = target;

    if (name === 'name') {
      this.name = value;
      this.nameError = '';
    } else if (name === 'displayId') {
      this.displayId = value;
      this.displayIdError = '';
    } else if (name === 'description') {
      this.description = value;
    } else if (name === 'publiclyVisible') {
      this.publiclyVisible = type === 'checkbox' ? (target as HTMLInputElement).checked : value === 'true';
    } else if (name === 'allowsAnyUserToCreateSubgroup') {
      this.allowsAnyUserToCreateSubgroup = type === 'checkbox' ? (target as HTMLInputElement).checked : value === 'true';
    }
  }

  private generateDisplayId() {
    if (this.name) {
      const normalized = this.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      this.displayId = normalized;
    }
  }

  private handleNameBlur() {
    if (!this.displayId && this.name) {
      this.generateDisplayId();
    }
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    // Validate
    this.nameError = '';
    this.displayIdError = '';

    if (!this.name.trim()) {
      this.nameError = 'Group name is required';
    }

    if (!this.displayId.trim()) {
      this.displayIdError = 'Display ID is required';
    }

    if (this.nameError || this.displayIdError) {
      return;
    }

    this.isSaving = true;

    try {
      const data = {
        name: this.name.trim(),
        displayId: this.displayId.trim(),
        description: this.description.trim() || null,
        publiclyVisible: this.publiclyVisible,
        allowsAnyUserToCreateSubgroup: this.allowsAnyUserToCreateSubgroup
      };

      const response = await this.api.createGroup(data);

      if (response.success && response.data) {
        this.store.dispatch(addNotification('Group created successfully', 'success'));
        // Navigate to groups list (when implemented) or home
        window.history.pushState({}, '', '/home');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to create group',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private handleCancel() {
    window.history.pushState({}, '', '/home');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  render() {
    return html`
      <div class="flex min-h-full flex-col py-12 sm:px-6 lg:px-8 pt-20">
        <div class="sm:mx-auto sm:w-full sm:max-w-2xl">
          <h2 class="text-2xl/9 font-bold tracking-tight text-gray-900 mb-6">
            Create Group
          </h2>

          <div class="bg-white px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            <form @submit=${this.handleSubmit} class="space-y-6">
              <div>
                <label for="name" class="block text-sm/6 font-medium text-gray-900">
                  Group Name
                </label>
                <div class="mt-2">
                  <input
                    id="name"
                    type="text"
                    name="name"
                    .value=${this.name}
                    required
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.nameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                    @blur=${this.handleNameBlur}
                  />
                  ${this.nameError ? html`<p class="mt-1 text-sm text-red-600">${this.nameError}</p>` : ''}
                </div>
              </div>

              <div>
                <label for="display-id" class="block text-sm/6 font-medium text-gray-900">
                  Display ID
                </label>
                <div class="mt-2">
                  <input
                    id="display-id"
                    type="text"
                    name="displayId"
                    .value=${this.displayId}
                    required
                    placeholder="my-group"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.displayIdError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  <p class="mt-1 text-sm text-gray-500">
                    A unique, web-safe identifier for this group
                  </p>
                  ${this.displayIdError ? html`<p class="mt-1 text-sm text-red-600">${this.displayIdError}</p>` : ''}
                </div>
              </div>

              <div>
                <label for="description" class="block text-sm/6 font-medium text-gray-900">
                  Description (optional)
                </label>
                <div class="mt-2">
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    .value=${this.description}
                    placeholder="A brief description of this group"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    @input=${this.handleInputChange}
                  ></textarea>
                </div>
              </div>

              <div class="relative flex items-start">
                <div class="flex h-6 items-center">
                  <input
                    id="publiclyVisible"
                    name="publiclyVisible"
                    type="checkbox"
                    .checked=${this.publiclyVisible}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    @change=${this.handleInputChange}
                  />
                </div>
                <div class="ml-3 text-sm/6">
                  <label for="publiclyVisible" class="font-medium text-gray-900">
                    Publicly Visible
                  </label>
                  <p class="text-gray-500">
                    Allow this group to be visible to all users
                  </p>
                </div>
              </div>

              <div class="relative flex items-start">
                <div class="flex h-6 items-center">
                  <input
                    id="allowsAnyUserToCreateSubgroup"
                    name="allowsAnyUserToCreateSubgroup"
                    type="checkbox"
                    .checked=${this.allowsAnyUserToCreateSubgroup}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    @change=${this.handleInputChange}
                  />
                </div>
                <div class="ml-3 text-sm/6">
                  <label for="allowsAnyUserToCreateSubgroup" class="font-medium text-gray-900">
                    Allow Any User to Create Subgroups
                  </label>
                  <p class="text-gray-500">
                    Let any user create subgroups under this group
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between gap-x-4">
                <button
                  type="button"
                  @click=${this.handleCancel}
                  class="text-sm/6 font-semibold text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  ?disabled=${this.isSaving}
                  class="flex justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${this.isSaving
                    ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                    : ''}
                  Create Group
                </button>
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
    'create-group-page': CreateGroupPage;
  }
}
