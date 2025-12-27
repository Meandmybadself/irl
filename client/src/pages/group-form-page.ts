import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectIsAuthenticated } from '../store/selectors.js';
import { toDisplayId } from '../utilities/string.js';
import { textColors, backgroundColors } from '../utilities/text-colors.js';
import '../components/ui/group-search.js';
import '../components/ui/contact-info-form.js';
import '../components/ui/group-admin-form.js';
import '../components/ui/group-member-form.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { Group, ContactInformation } from '@irl/shared';

@customElement('group-form-page')
export class GroupFormPage extends LitElement {
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
  private groupId: number | null = null;

  @state()
  private groupDisplayId: string | null = null;

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
  private parentGroup: Group | null = null;

  @state()
  private nameError = '';

  @state()
  private displayIdError = '';

  @state()
  private isSaving = false;

  @state()
  private isLoading = false;

  @state()
  private contactInformations: ContactInformation[] = [];

  @state()
  private adminPersonIds: number[] = [];

  @state()
  private memberPersonIds: number[] = [];

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is authenticated
    const isAuthenticated = selectIsAuthenticated(this.store.getState());
    if (!isAuthenticated) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    // Check if we're editing an existing group
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'groups' && pathParts[2] && pathParts[2] !== 'create' && pathParts[3] === 'edit') {
      this.groupDisplayId = pathParts[2];
      await this.loadGroup();
    }
  }

  private async loadGroup() {
    if (!this.groupDisplayId) return;

    this.isLoading = true;
    try {
      const groupResponse = await this.api.getGroup(this.groupDisplayId);

      if (groupResponse.success && groupResponse.data) {
        const group = groupResponse.data;
        this.groupId = group.id;
        this.name = group.name;
        this.displayId = group.displayId;
        this.description = group.description || '';
        this.publiclyVisible = group.publiclyVisible;
        this.allowsAnyUserToCreateSubgroup = group.allowsAnyUserToCreateSubgroup;

        // TODO: Load parent group if it exists
        // Note: This requires fetching by ID, but we need displayId for the new API
        // For now, parentGroup will remain null when editing
        // if (group.parentGroupId) {
        //   const parentResponse = await this.api.getGroup(group.parentGroupId);
        //   if (parentResponse.success && parentResponse.data) {
        //     this.parentGroup = parentResponse.data;
        //   }
        // }

        // Load contact information using displayId
        const contactsResponse = await this.api.getGroupContactInformations(group.displayId);
        if (contactsResponse.success && contactsResponse.data) {
          this.contactInformations = contactsResponse.data;
        }

        // Load person IDs
        await this.loadPersonIds();
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(`Failed to load group: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      );
      // Redirect back to groups list on error
      window.history.pushState({}, '', '/groups');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } finally {
      this.isLoading = false;
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
      this.displayId = toDisplayId(this.name);
    }
  }

  private handleNameBlur() {
    if (!this.displayId && this.name) {
      this.generateDisplayId();
    }
  }

  private handleGroupSelected(e: CustomEvent) {
    this.parentGroup = e.detail.group;
  }

  private handleGroupCleared() {
    this.parentGroup = null;
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
        allowsAnyUserToCreateSubgroup: this.allowsAnyUserToCreateSubgroup,
        parentGroupId: this.parentGroup?.id || null
      };

      let response;
      if (this.groupDisplayId) {
        // Update existing group
        response = await this.api.patchGroup(this.groupDisplayId, data);
        if (response.success) {
          this.store.dispatch(addNotification('Group updated successfully', 'success'));
        }
      } else {
        // Create new group
        response = await this.api.createGroup(data);
        if (response.success) {
          this.store.dispatch(addNotification('Group created successfully', 'success'));
        }
      }

      if (response.success) {
        // Navigate to groups list
        window.history.pushState({}, '', '/groups');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(`Failed to ${this.groupDisplayId ? 'update' : 'create'} group: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      );
    } finally {
      this.isSaving = false;
    }
  }

  private handleCancel() {
    window.history.pushState({}, '', '/groups');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private async loadPersonIds() {
    if (!this.groupId) return;

    try {
      const response = await this.api.getPersonGroups();
      if (response.success && response.data) {
        const groupPersonGroups = response.data.filter(pg => pg.groupId === this.groupId);
        this.adminPersonIds = groupPersonGroups
          .filter(pg => pg.isAdmin)
          .map(pg => pg.personId);
        this.memberPersonIds = groupPersonGroups
          .filter(pg => !pg.isAdmin)
          .map(pg => pg.personId);
      }
    } catch (error) {
      console.error('Failed to load person IDs:', error);
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
            ${this.groupDisplayId ? 'Edit Group' : 'Create Group'}
          </h2>

          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            <form @submit=${this.handleSubmit} class="space-y-6">
              <div>
                <label for="name" class="block text-sm/6 font-medium ${textColors.primary}">
                  Group Name
                </label>
                <div class="mt-2">
                  <input
                    id="name"
                    type="text"
                    name="name"
                    .value=${this.name}
                    required
                    class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.nameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                    @blur=${this.handleNameBlur}
                  />
                  ${this.nameError ? html`<p class="mt-1 text-sm ${textColors.error}">${this.nameError}</p>` : ''}
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
                    placeholder="my-group"
                    class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.displayIdError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  <p class="mt-1 text-sm ${textColors.tertiary}">
                    A unique, web-safe identifier for this group
                  </p>
                  ${this.displayIdError ? html`<p class="mt-1 text-sm ${textColors.error}">${this.displayIdError}</p>` : ''}
                </div>
              </div>

              <div>
                <label for="description" class="block text-sm/6 font-medium ${textColors.primary}">
                  Description (optional)
                </label>
                <div class="mt-2">
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    .value=${this.description}
                    placeholder="A brief description of this group"
                    class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    @input=${this.handleInputChange}
                  ></textarea>
                </div>
              </div>

              <group-search
                .selectedGroup=${this.parentGroup}
                .excludeGroupId=${this.groupId}
                @group-selected=${this.handleGroupSelected}
                @group-cleared=${this.handleGroupCleared}
              ></group-search>

              <div class="relative flex items-start">
                <div class="flex h-6 items-center">
                  <input
                    id="publiclyVisible"
                    name="publiclyVisible"
                    type="checkbox"
                    .checked=${this.publiclyVisible}
                    class="h-4 w-4 rounded ${backgroundColors.border} text-indigo-600 focus:ring-indigo-600"
                    @change=${this.handleInputChange}
                  />
                </div>
                <div class="ml-3 text-sm/6">
                  <label for="publiclyVisible" class="font-medium ${textColors.primary}">
                    Publicly Visible
                  </label>
                  <p class="${textColors.tertiary}">
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
                    class="h-4 w-4 rounded ${backgroundColors.border} text-indigo-600 focus:ring-indigo-600"
                    @change=${this.handleInputChange}
                  />
                </div>
                <div class="ml-3 text-sm/6">
                  <label for="allowsAnyUserToCreateSubgroup" class="font-medium ${textColors.primary}">
                    Allow Any User to Create Subgroups
                  </label>
                  <p class="${textColors.tertiary}">
                    Let any user create subgroups under this group
                  </p>
                </div>
              </div>

              ${this.groupId ? html`
                <contact-info-form
                  entityType="group"
                  .entityId=${this.groupId}
                  .contactInformations=${this.contactInformations}
                  @contact-info-changed=${(e: CustomEvent) => {
                    this.contactInformations = e.detail.items;
                  }}
                  @contact-error=${(e: CustomEvent) => {
                    this.store.dispatch(addNotification(e.detail.error, 'error'));
                  }}
                ></contact-info-form>

                <group-admin-form
                  .groupId=${this.groupId}
                  .groupDisplayId=${this.groupDisplayId}
                  .excludePersonIds=${this.memberPersonIds}
                  @admin-added=${async () => {
                    this.store.dispatch(addNotification('Administrator added successfully', 'success'));
                    // Reload person IDs
                    await this.loadPersonIds();
                  }}
                  @admin-removed=${async () => {
                    this.store.dispatch(addNotification('Administrator removed successfully', 'success'));
                    // Reload person IDs
                    await this.loadPersonIds();
                  }}
                  @admin-error=${(e: CustomEvent) => {
                    this.store.dispatch(addNotification(e.detail.error, 'error'));
                  }}
                ></group-admin-form>

                <group-member-form
                  .groupId=${this.groupId}
                  .groupDisplayId=${this.groupDisplayId}
                  .excludePersonIds=${this.adminPersonIds}
                  @member-added=${async () => {
                    this.store.dispatch(addNotification('Member added successfully', 'success'));
                    // Reload person IDs
                    await this.loadPersonIds();
                  }}
                  @member-removed=${async () => {
                    this.store.dispatch(addNotification('Member removed successfully', 'success'));
                    // Reload person IDs
                    await this.loadPersonIds();
                  }}
                  @member-error=${(e: CustomEvent) => {
                    this.store.dispatch(addNotification(e.detail.error, 'error'));
                  }}
                ></group-member-form>
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
                  ${this.groupDisplayId ? 'Update Group' : 'Create Group'}
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
    'group-form-page': GroupFormPage;
  }
}
