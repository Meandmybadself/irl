import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import { toDisplayId } from '../utilities/string.js';
import { textColors, backgroundColors } from '../utilities/text-colors.js';
import '../components/ui/contact-info-form.js';
import '../components/ui/image-cropper-modal.js';
import '../components/ui/interests-form.js';
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
  private personDisplayId: string | null = null;

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
  private isSaving = false;

  @state()
  private isLoading = false;

  @state()
  private contactInformations: ContactInformation[] = [];

  @state()
  private selectedImageUrl = '';

  @state()
  private showCropperModal = false;

  @state()
  private isUploadingAvatar = false;

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
      this.personDisplayId = pathParts[2];
      await this.loadPerson();
    }
  }

  private async loadPerson() {
    if (!this.personDisplayId) return;

    this.isLoading = true;
    try {
      const personResponse = await this.api.getPerson(this.personDisplayId);

      if (personResponse.success && personResponse.data) {
        const person = personResponse.data;
        this.personId = person.id;
        this.firstName = person.firstName;
        this.lastName = person.lastName;
        this.displayId = person.displayId;
        this.pronouns = person.pronouns || '';
        this.imageURL = person.imageURL || '';

        // Load contact information using numeric ID
        const contactsResponse = await this.api.getPersonContactInformations(person.displayId);
        if (contactsResponse.success && contactsResponse.data) {
          this.contactInformations = contactsResponse.data;
        }
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(`Failed to load person: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
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

    if (!this.firstName.trim()) {
      this.firstNameError = 'First name is required';
    }

    if (!this.lastName.trim()) {
      this.lastNameError = 'Last name is required';
    }

    if (!this.displayId.trim()) {
      this.displayIdError = 'Display ID is required';
    }

    if (this.firstNameError || this.lastNameError || this.displayIdError) {
      return;
    }

    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser && !this.personDisplayId) {
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
        imageURL: this.imageURL || null,
        ...(currentUser && !this.personDisplayId && { userId: currentUser.id })
      };

      let response;
      if (this.personDisplayId) {
        // Update existing person
        response = await this.api.patchPerson(this.personDisplayId, data);
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
        addNotification(`Failed to ${this.personDisplayId ? 'update' : 'create'} person: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      );
    } finally {
      this.isSaving = false;
    }
  }

  private handleCancel() {
    window.history.pushState({}, '', '/persons');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.store.dispatch(addNotification('Please select a valid image file (JPG, PNG, or WebP)', 'error'));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      this.store.dispatch(addNotification('Image file must be less than 5MB', 'error'));
      return;
    }

    // Create object URL for preview
    this.selectedImageUrl = URL.createObjectURL(file);
    this.showCropperModal = true;

    // Clear the input so the same file can be selected again
    input.value = '';
  }

  private handleCropperCancel() {
    this.showCropperModal = false;
    if (this.selectedImageUrl) {
      URL.revokeObjectURL(this.selectedImageUrl);
      this.selectedImageUrl = '';
    }
  }

  private async handleCropperSave(e: CustomEvent) {
    const { blob } = e.detail;

    // Close the modal
    this.showCropperModal = false;
    if (this.selectedImageUrl) {
      URL.revokeObjectURL(this.selectedImageUrl);
      this.selectedImageUrl = '';
    }

    // If editing an existing person, upload immediately
    if (this.personDisplayId) {
      this.isUploadingAvatar = true;
      try {
        const response = await this.api.uploadPersonAvatar(this.personDisplayId, blob);
        if (response.success && response.data) {
          this.imageURL = response.data.imageURL || '';
          this.store.dispatch(addNotification('Profile photo updated successfully', 'success'));
        }
      } catch (error) {
        this.store.dispatch(
          addNotification(`Failed to upload profile photo: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
        );
      } finally {
        this.isUploadingAvatar = false;
      }
    } else {
      // For new persons, store the blob for later upload
      this.store.dispatch(addNotification('Profile photo will be uploaded after creating the person', 'info'));
      // Create temporary preview URL
      this.imageURL = URL.createObjectURL(blob);
    }
  }

  private handleCropperError(e: CustomEvent) {
    this.store.dispatch(addNotification(e.detail.error, 'error'));
  }

  private handleUploadButtonClick() {
    const fileInput = this.querySelector('#avatar-upload') as HTMLInputElement;
    if (fileInput && !this.isUploadingAvatar) {
      fileInput.click();
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
          <h2 class="text-2xl/9 font-bold tracking-tight ${textColors.primary} mb-6">
            ${this.personDisplayId ? 'Edit Person' : 'Create Person'}
          </h2>

          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            <form @submit=${this.handleSubmit} class="space-y-6">
              <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div>
                  <label for="first-name" class="block text-sm/6 font-medium ${textColors.primary}">
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
                      class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.firstNameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                      @blur=${this.handleFirstOrLastNameBlur}
                    />
                    ${this.firstNameError ? html`<p class="mt-1 text-sm ${textColors.error}">${this.firstNameError}</p>` : ''}
                  </div>
                </div>

                <div>
                  <label for="last-name" class="block text-sm/6 font-medium ${textColors.primary}">
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
                      class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.lastNameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                      @blur=${this.handleFirstOrLastNameBlur}
                    />
                    ${this.lastNameError ? html`<p class="mt-1 text-sm ${textColors.error}">${this.lastNameError}</p>` : ''}
                  </div>
                </div>
              </div>

              <div>
                <label for="display-id" class="block text-sm/6 font-medium ${textColors.primary}">
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
                    class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.displayIdError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  <p class="mt-1 text-sm ${textColors.tertiary}">
                    A unique, web-safe identifier for this person
                  </p>
                  ${this.displayIdError ? html`<p class="mt-1 text-sm ${textColors.error}">${this.displayIdError}</p>` : ''}
                </div>
              </div>

              <div>
                <label for="pronouns" class="block text-sm/6 font-medium ${textColors.primary}">
                  Pronouns (optional)
                </label>
                <div class="mt-2">
                  <input
                    id="pronouns"
                    type="text"
                    name="pronouns"
                    .value=${this.pronouns}
                    placeholder="he/him, she/her, they/them"
                    class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    @input=${this.handleInputChange}
                  />
                </div>
              </div>

              ${this.personId ? html`
                <div>
                  <label class="block text-sm/6 font-medium ${textColors.primary} mb-2">
                    Profile Photo
                  </label>
                  <div class="flex items-center gap-4">
                    ${this.imageURL ? html`
                      <img
                        src=${this.imageURL}
                        alt="Profile preview"
                        class="w-20 h-20 rounded-full object-cover border-2 ${backgroundColors.border}"
                      />
                    ` : html`
                      <div class="w-20 h-20 rounded-full ${backgroundColors.pageAlt} flex items-center justify-center border-2 ${backgroundColors.border}">
                        <span class="text-2xl ${textColors.tertiary}">?</span>
                      </div>
                    `}
                    <div>
                      <button
                        type="button"
                        @click=${this.handleUploadButtonClick}
                        ?disabled=${this.isUploadingAvatar}
                        class="cursor-pointer inline-flex items-center px-4 py-2 rounded-md border ${backgroundColors.border} text-sm font-medium ${textColors.primary} ${backgroundColors.content} ${backgroundColors.contentHover} focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ${this.isUploadingAvatar ? html`
                          <span class="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin mr-2"></span>
                          Uploading...
                        ` : html`
                          ${this.imageURL ? 'Change Photo' : 'Upload Photo'}
                        `}
                      </button>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        class="hidden"
                        @change=${this.handleFileSelect}
                        ?disabled=${this.isUploadingAvatar}
                      />
                      <p class="mt-1 text-xs ${textColors.tertiary}">
                        JPG, PNG, or WebP. Max 5MB.
                      </p>
                    </div>
                  </div>
                </div>
              ` : ''}

              ${this.personId ? html`
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
              ` : ''}

              ${this.personDisplayId ? html`
                <div class="pt-6 border-t ${backgroundColors.border}">
                  <interests-form
                    .personDisplayId=${this.personDisplayId}
                    @interests-saved=${() => {
                      this.store.dispatch(addNotification('Interests saved successfully', 'success'));
                    }}
                    @interest-error=${(e: CustomEvent) => {
                      this.store.dispatch(addNotification(e.detail.error, 'error'));
                    }}
                  ></interests-form>
                </div>
              ` : ''}

              <div class="flex items-center justify-between gap-x-4">
                <button
                  type="button"
                  @click=${this.handleCancel}
                  class="text-sm/6 font-semibold ${textColors.primary}"
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
                  ${this.personDisplayId ? 'Update Person' : 'Create Person'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <image-cropper-modal
          .imageUrl=${this.selectedImageUrl}
          .open=${this.showCropperModal}
          @cancel=${this.handleCropperCancel}
          @save=${this.handleCropperSave}
          @error=${this.handleCropperError}
        ></image-cropper-modal>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'person-form-page': PersonFormPage;
  }
}
