import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import '../components/ui/contact-info-display.js';
import '../components/ui/person-list.js';
import { backgroundColors, textColors } from '../utilities/text-colors.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { Group, ContactInformation, PersonGroupWithRelations, Person } from '@irl/shared';

@customElement('group-detail-page')
export class GroupDetailPage extends LitElement {
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
  private group: Group | null = null;

  @state()
  private contactInformations: ContactInformation[] = [];

  @state()
  private personGroups: PersonGroupWithRelations[] = [];

  @state()
  private persons: Person[] = [];

  @state()
  private personContacts: Map<number, ContactInformation[]> = new Map();

  @state()
  private adminPersonIds: number[] = [];

  @state()
  private parentGroup: Group | null = null;

  @state()
  private isLoading = false;

  @state()
  private canEdit = false;

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is authenticated
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    // Get group displayId from URL
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'groups' && pathParts[2]) {
      const displayId = pathParts[2];
      await this.loadGroup(displayId);
    }
  }

  private async loadGroup(displayId: string) {
    this.isLoading = true;
    this.personContacts = new Map();
    try {
      // Load group data
      const groupResponse = await this.api.getGroup(displayId);
      if (!groupResponse.success || !groupResponse.data) {
        throw new Error(groupResponse.error || 'Failed to load group');
      }
      this.group = groupResponse.data;

      // Load contact information
      const contactsResponse = await this.api.getGroupContactInformations(displayId);
      if (contactsResponse.success && contactsResponse.data) {
        this.contactInformations = contactsResponse.data;
      }

      // Load members for this group
      const membersResponse = await this.api.getPersonGroupsByGroup(displayId);
      if (membersResponse.success && membersResponse.data) {
        this.personGroups = membersResponse.data;
        this.persons = this.personGroups.map(pg => pg.person!).filter(Boolean);
        this.adminPersonIds = this.personGroups
          .filter(pg => pg.isAdmin)
          .map(pg => pg.personId);

        // Check if current user is an admin of this group
        const currentUser = selectCurrentUser(this.store.getState());
        if (currentUser) {
          // Find if any of the current user's persons are admins
          const userPersonIds = this.persons
            .filter(p => p.userId === currentUser.id)
            .map(p => p.id);
          this.canEdit = userPersonIds.some(id => this.adminPersonIds.includes(id));
        }

        if (this.persons.length > 0) {
          const contactsMap = new Map<number, ContactInformation[]>();
          await Promise.all(
            this.persons.map(async person => {
              try {
                const contactsResponse = await this.api.getPersonContactInformations(person.displayId);
                if (contactsResponse.success && contactsResponse.data) {
                  contactsMap.set(person.id, contactsResponse.data);
                } else {
                  contactsMap.set(person.id, []);
                }
              } catch (error) {
                contactsMap.set(person.id, []);
              }
            })
          );
          this.personContacts = contactsMap;
        }
      }

      // Load parent group if exists
      if (this.group.parentGroupId) {
        // We need to find the parent by ID - we'll need to get all groups and find it
        // For now, we'll skip this as it requires additional API work
        // TODO: Add an endpoint to get group by numeric ID
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

  private handleEdit() {
    if (this.group) {
      window.history.pushState({}, '', `/groups/${this.group.displayId}/edit`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  private handleBack() {
    window.history.pushState({}, '', '/groups');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="flex min-h-full items-center justify-center py-6 pt-16">
          <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
        </div>
      `;
    }

    if (!this.group) {
      return html`
        <div class="flex min-h-full items-center justify-center py-6 pt-16">
          <p class="${textColors.tertiary}">Group not found</p>
        </div>
      `;
    }

    return html`
      <div class="flex min-h-full flex-col py-6 sm:px-6 lg:px-8 pt-16">
        <div class="sm:mx-auto sm:w-full sm:max-w-4xl">
          <!-- Breadcrumb -->
          <nav class="flex mb-4" aria-label="Breadcrumb">
            <ol class="flex items-center space-x-2">
              <li>
                <button
                  @click=${this.handleBack}
                  class="bg-transparent border-none cursor-pointer text-sm ${textColors.muted} hover:opacity-80"
                >
                  Groups
                </button>
              </li>
              <li>
                <div class="flex items-center">
                  <svg class="h-5 w-5 ${textColors.muted}" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span class="ml-2 text-sm font-medium ${textColors.secondary}">${this.group.name}</span>
                </div>
              </li>
            </ol>
          </nav>

          <!-- Header -->
          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg mb-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h1 class="text-3xl font-bold ${textColors.primary}">
                    ${this.group.name}
                  </h1>
                  ${this.group.publiclyVisible
                    ? html`<span class="inline-flex items-center rounded-md ${backgroundColors.badgePublic} ${textColors.success} px-3 py-1 text-sm font-medium ring-1 ring-green-600/20 dark:ring-green-500/30 ring-inset">Public</span>`
                    : html`<span class="inline-flex items-center rounded-md ${backgroundColors.badgePrivate} ${textColors.secondary} px-3 py-1 text-sm font-medium ring-1 ring-gray-500/20 dark:ring-gray-400/30 ring-inset">Private</span>`}
                </div>
                ${this.group.description
                  ? html`<p class="mt-2 text-lg ${textColors.secondary}">${this.group.description}</p>`
                  : ''}
                <dl class="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <div>
                    <dt class="text-sm font-medium ${textColors.tertiary}">Display ID</dt>
                    <dd class="mt-1 text-sm ${textColors.primary}">${this.group.displayId}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium ${textColors.tertiary}">Subgroup Creation</dt>
                    <dd class="mt-1 text-sm ${textColors.primary}">
                      ${this.group.allowsAnyUserToCreateSubgroup ? 'Open to any user' : 'Restricted'}
                    </dd>
                  </div>
                  ${this.parentGroup
                    ? html`
                        <div>
                          <dt class="text-sm font-medium ${textColors.tertiary}">Parent Group</dt>
                          <dd class="mt-1 text-sm ${textColors.primary}">${this.parentGroup.name}</dd>
                        </div>
                      `
                    : ''}
                </dl>
                
                <div class="mt-6 pt-6 border-t ${backgroundColors.border}">
                  <contact-info-display
                    .contactInformations=${this.contactInformations}
                    .showPrivate=${this.canEdit}
                  ></contact-info-display>
                </div>
              </div>
              ${this.canEdit
                ? html`
                    <button
                      @click=${this.handleEdit}
                      class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      Edit
                    </button>
                  `
                : ''}
            </div>
          </div>

          <div class="space-y-6">

            <!-- Administrators -->
            <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg">
              <h3 class="text-lg font-medium ${textColors.primary} mb-4">Administrators</h3>
              ${this.adminPersonIds.length === 0
                ? html`
                    <p class="text-center py-8 text-sm ${textColors.tertiary}">
                      No administrators assigned yet.
                    </p>
                  `
                : html`
                    <div class="-mx-6 -mb-8 mt-4">
                      <div class="overflow-hidden">
                        <person-list
                          .persons=${this.persons.filter(p => this.adminPersonIds.includes(p.id))}
                          .showAdmin=${false}
                          .adminPersonIds=${[]}
                          .linkToDetail=${true}
                          .showEdit=${false}
                          .isLoading=${this.isLoading}
                          .personContacts=${this.personContacts}
                        ></person-list>
                      </div>
                    </div>
                  `}
            </div>

            <!-- Members -->
            <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg">
              <h3 class="text-lg font-medium ${textColors.primary} mb-4">Members</h3>
              ${this.persons.filter(p => !this.adminPersonIds.includes(p.id)).length === 0
                ? html`
                    <p class="text-center py-8 text-sm ${textColors.tertiary}">
                      No members assigned yet.
                    </p>
                  `
                : html`
                    <div class="-mx-6 -mb-8 mt-4">
                      <div class="overflow-hidden">
                        <person-list
                          .persons=${this.persons.filter(p => !this.adminPersonIds.includes(p.id))}
                          .showAdmin=${false}
                          .adminPersonIds=${[]}
                          .linkToDetail=${true}
                          .showEdit=${false}
                          .isLoading=${this.isLoading}
                          .personContacts=${this.personContacts}
                        ></person-list>
                      </div>
                    </div>
                  `}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-detail-page': GroupDetailPage;
  }
}
