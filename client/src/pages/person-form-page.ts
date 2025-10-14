import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import { toDisplayId } from '../utilities/string.js';
import '../components/ui/contact-info-form.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { ContactInformation } from '@irl/shared';

@customElement('person-form-page')
export class PersonFormPage extends LitElement {
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
  private personId: number | null = null;

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

  @state()
  private isLoading = false;

  @state()
  private contactInformations: ContactInformation[] = [];

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is authenticated
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    // Check if we're editing an existing person
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'persons' && pathParts[2] && pathParts[2] !== 'create' && pathParts[3] === 'edit') {
      this.personId = parseInt(pathParts[2]);
      await this.loadPerson();
    }
  }

  private async loadPerson() {
    if (!this.personId) return;

    this.isLoading = true;
    try {
      const response = await this.api.getPerson(this.personId);
      if (response.success && response.data) {
        const person = response.data;
        this.firstName = person.firstName;
        this.lastName = person.lastName;
        this.displayId = person.displayId;
        this.pronouns = person.pronouns || '';
        this.imageURL = person.imageURL || '';
      }

      // TODO: Load contact information when backend endpoint is available
      // For now, contact information starts empty
      this.contactInformations = [];
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load person',
          'error'
        )
      );
      // Redirect back to persons list on error
      window.history.pushState({}, '', '/persons');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } finally {
      this.isLoading = false;
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
      const baseId = `${this.firstName}-${this.lastName}`;
      this.displayId = toDisplayId(baseId);
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
    if (!currentUser && !this.personId) {
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
        ...(currentUser && !this.personId && { userId: currentUser.id })
      };

      let response;
      if (this.personId) {
        // Update existing person
        response = await this.api.patchPerson(this.personId, data);
        if (response.success) {
          this.store.dispatch(addNotification('Person updated successfully', 'success'));
        }
      } else {
        // Create new person
        response = await this.api.createPerson({ ...data, userId: currentUser!.id });
        if (response.success) {
          this.store.dispatch(addNotification('Person created successfully', 'success'));
        }
      }

      if (response.success) {
        // Navigate to persons list
        window.history.pushState({}, '', '/persons');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : `Failed to ${this.personId ? 'update' : 'create'} person`,
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private handleCancel() {
    window.history.pushState({}, '', '/persons');
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
          <h2 class="text-2xl/9 font-bold tracking-tight text-gray-900 mb-6">
            ${this.personId ? 'Edit Person' : 'Create Person'}
          </h2>

          <div class="bg-white px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            <form @submit=${this.handleSubmit} class="space-y-6">
              <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div>
                  <label for="first-name" class="block text-sm/6 font-medium text-gray-900">
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
                      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.firstNameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                      @blur=${this.handleFirstOrLastNameBlur}
                    />
                    ${this.firstNameError ? html`<p class="mt-1 text-sm text-red-600">${this.firstNameError}</p>` : ''}
                  </div>
                </div>

                <div>
                  <label for="last-name" class="block text-sm/6 font-medium text-gray-900">
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
                      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.lastNameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                      @blur=${this.handleFirstOrLastNameBlur}
                    />
                    ${this.lastNameError ? html`<p class="mt-1 text-sm text-red-600">${this.lastNameError}</p>` : ''}
                  </div>
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
                    placeholder="john-doe"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.displayIdError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  <p class="mt-1 text-sm text-gray-500">
                    A unique, web-safe identifier for this person
                  </p>
                  ${this.displayIdError ? html`<p class="mt-1 text-sm text-red-600">${this.displayIdError}</p>` : ''}
                </div>
              </div>

              <div>
                <label for="pronouns" class="block text-sm/6 font-medium text-gray-900">
                  Pronouns (optional)
                </label>
                <div class="mt-2">
                  <input
                    id="pronouns"
                    type="text"
                    name="pronouns"
                    .value=${this.pronouns}
                    placeholder="he/him, she/her, they/them"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    @input=${this.handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label for="image-url" class="block text-sm/6 font-medium text-gray-900">
                  Image URL (optional)
                </label>
                <div class="mt-2">
                  <input
                    id="image-url"
                    type="url"
                    name="imageURL"
                    .value=${this.imageURL}
                    placeholder="https://example.com/avatar.jpg"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.imageURLError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  ${this.imageURLError ? html`<p class="mt-1 text-sm text-red-600">${this.imageURLError}</p>` : ''}
                </div>
              </div>

              <contact-info-form
                entityType="person"
                .entityId=${this.personId}
                .contactInformations=${this.contactInformations}
                @contact-info-changed=${(e: CustomEvent) => {
                  this.contactInformations = e.detail.items;
                }}
                @contact-error=${(e: CustomEvent) => {
                  this.store.dispatch(addNotification(e.detail.error, 'error'));
                }}
              ></contact-info-form>

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
                  ${this.personId ? 'Update Person' : 'Create Person'}
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
    'person-form-page': PersonFormPage;
  }
}
