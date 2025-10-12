import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';

@customElement('create-person-page')
export class CreatePersonPage extends LitElement {
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
  private firstName = '';

  @state()
  private lastName = '';

  @state()
  private displayId = '';

  @state()
  private pronouns = '';

  @state()
  private imageURL = '';

  @state()
  private firstNameError = '';

  @state()
  private lastNameError = '';

  @state()
  private displayIdError = '';

  @state()
  private imageURLError = '';

  @state()
  private isSaving = false;

  connectedCallback() {
    super.connectedCallback();

    // Check if user is authenticated
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    if (name === 'firstName') {
      this.firstName = value;
      this.firstNameError = '';
    } else if (name === 'lastName') {
      this.lastName = value;
      this.lastNameError = '';
    } else if (name === 'displayId') {
      this.displayId = value;
      this.displayIdError = '';
    } else if (name === 'pronouns') {
      this.pronouns = value;
    } else if (name === 'imageURL') {
      this.imageURL = value;
      this.imageURLError = '';
    }
  }

  private generateDisplayId() {
    if (this.firstName && this.lastName) {
      const baseId = `${this.firstName.toLowerCase()}-${this.lastName.toLowerCase()}`;
      const normalized = baseId
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      this.displayId = normalized;
    }
  }

  private handleFirstOrLastNameBlur() {
    if (!this.displayId && this.firstName && this.lastName) {
      this.generateDisplayId();
    }
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    // Validate
    this.firstNameError = '';
    this.lastNameError = '';
    this.displayIdError = '';
    this.imageURLError = '';

    if (!this.firstName.trim()) {
      this.firstNameError = 'First name is required';
    }

    if (!this.lastName.trim()) {
      this.lastNameError = 'Last name is required';
    }

    if (!this.displayId.trim()) {
      this.displayIdError = 'Display ID is required';
    }

    if (this.imageURL && !this.isValidURL(this.imageURL)) {
      this.imageURLError = 'Invalid URL format';
    }

    if (this.firstNameError || this.lastNameError || this.displayIdError || this.imageURLError) {
      return;
    }

    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser) {
      this.store.dispatch(addNotification('You must be logged in to create a person', 'error'));
      return;
    }

    this.isSaving = true;

    try {
      const data = {
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        displayId: this.displayId.trim(),
        pronouns: this.pronouns.trim() || null,
        imageURL: this.imageURL.trim() || null,
        userId: currentUser.id
      };

      const response = await this.api.createPerson(data);

      if (response.success && response.data) {
        this.store.dispatch(addNotification('Person created successfully', 'success'));
        // Navigate to home or person list
        window.history.pushState({}, '', '/home');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to create person',
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

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  render() {
    return html`
      <div class="flex min-h-full flex-col py-12 sm:px-6 lg:px-8 pt-20">
        <div class="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3 max-w-7xl mx-auto w-full">
          <div class="px-4 sm:px-0">
            <h2 class="text-base/7 font-semibold text-gray-900 dark:text-white">Personal Information</h2>
            <p class="mt-1 text-sm/6 text-gray-600 dark:text-gray-400">
              Create a new person profile. This will be associated with your user account.
            </p>
          </div>

          <form
            @submit=${this.handleSubmit}
            class="bg-white shadow-xs outline outline-gray-900/5 sm:rounded-xl md:col-span-2 dark:bg-gray-800/50 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
          >
            <div class="px-4 py-6 sm:p-8">
              <div class="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div class="sm:col-span-3">
                  <label for="first-name" class="block text-sm/6 font-medium text-gray-900 dark:text-white">
                    First name
                  </label>
                  <div class="mt-2">
                    <input
                      id="first-name"
                      type="text"
                      name="firstName"
                      .value=${this.firstName}
                      required
                      autocomplete="given-name"
                      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 ${this.firstNameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                      @blur=${this.handleFirstOrLastNameBlur}
                    />
                    ${this.firstNameError ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.firstNameError}</p>` : ''}
                  </div>
                </div>

                <div class="sm:col-span-3">
                  <label for="last-name" class="block text-sm/6 font-medium text-gray-900 dark:text-white">
                    Last name
                  </label>
                  <div class="mt-2">
                    <input
                      id="last-name"
                      type="text"
                      name="lastName"
                      .value=${this.lastName}
                      required
                      autocomplete="family-name"
                      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 ${this.lastNameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                      @blur=${this.handleFirstOrLastNameBlur}
                    />
                    ${this.lastNameError ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.lastNameError}</p>` : ''}
                  </div>
                </div>

                <div class="sm:col-span-4">
                  <label for="display-id" class="block text-sm/6 font-medium text-gray-900 dark:text-white">
                    Display ID
                  </label>
                  <div class="mt-2">
                    <input
                      id="display-id"
                      type="text"
                      name="displayId"
                      .value=${this.displayId}
                      required
                      placeholder="john-doe"
                      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 ${this.displayIdError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                    />
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      A unique, web-safe identifier for this person
                    </p>
                    ${this.displayIdError ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.displayIdError}</p>` : ''}
                  </div>
                </div>

                <div class="sm:col-span-3">
                  <label for="pronouns" class="block text-sm/6 font-medium text-gray-900 dark:text-white">
                    Pronouns (optional)
                  </label>
                  <div class="mt-2">
                    <input
                      id="pronouns"
                      type="text"
                      name="pronouns"
                      .value=${this.pronouns}
                      placeholder="he/him, she/her, they/them"
                      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                      @input=${this.handleInputChange}
                    />
                  </div>
                </div>

                <div class="col-span-full">
                  <label for="image-url" class="block text-sm/6 font-medium text-gray-900 dark:text-white">
                    Image URL (optional)
                  </label>
                  <div class="mt-2">
                    <input
                      id="image-url"
                      type="url"
                      name="imageURL"
                      .value=${this.imageURL}
                      placeholder="https://example.com/avatar.jpg"
                      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 ${this.imageURLError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                    />
                    ${this.imageURLError ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.imageURLError}</p>` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8 dark:border-white/10">
              <button
                type="button"
                @click=${this.handleCancel}
                class="text-sm/6 font-semibold text-gray-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                ?disabled=${this.isSaving}
                class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ${this.isSaving
                  ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                  : ''}
                Save
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
    'create-person-page': CreatePersonPage;
  }
}
