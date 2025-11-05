import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import '../components/ui/contact-info-display.js';
import '../components/ui/group-list.js';
import { backgroundColors, textColors } from '../utilities/text-colors.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { Person, ContactInformation, PersonGroupWithRelations, Group } from '@irl/shared';

@customElement('person-detail-page')
export class PersonDetailPage extends LitElement {
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
  private person: Person | null = null;

  @state()
  private contactInformations: ContactInformation[] = [];

  @state()
  private personGroups: PersonGroupWithRelations[] = [];

  @state()
  private groups: Group[] = [];

  @state()
  private groupContacts: Map<number, ContactInformation[]> = new Map();

  @state()
  private adminGroupIds: number[] = [];

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

    // Get person displayId from URL
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'persons' && pathParts[2]) {
      const displayId = pathParts[2];
      await this.loadPerson(displayId);
    }
  }

  private async loadPerson(displayId: string) {
    this.isLoading = true;
    this.groupContacts = new Map();
    try {
      // Load person data
      const personResponse = await this.api.getPerson(displayId);
      if (!personResponse.success || !personResponse.data) {
        throw new Error(personResponse.error || 'Failed to load person');
      }
      this.person = personResponse.data;

      // Check if current user can edit this person
      const currentUser = selectCurrentUser(this.store.getState());
      this.canEdit = currentUser?.id === this.person.userId;

      // Load contact information
      const contactsResponse = await this.api.getPersonContactInformations(displayId);
      if (contactsResponse.success && contactsResponse.data) {
        this.contactInformations = contactsResponse.data;
      }

      // Load groups for this person
      const groupsResponse = await this.api.getPersonGroupsByPerson(displayId);
      if (groupsResponse.success && groupsResponse.data) {
        this.personGroups = groupsResponse.data;
        this.groups = this.personGroups.map(pg => pg.group!).filter(Boolean);
        this.adminGroupIds = this.personGroups
          .filter(pg => pg.isAdmin)
          .map(pg => pg.groupId);

        if (this.groups.length > 0) {
          const contactsMap = new Map<number, ContactInformation[]>();
          await Promise.all(
            this.groups.map(async group => {
              try {
                const contactsResponse = await this.api.getGroupContactInformations(group.displayId);
                if (contactsResponse.success && contactsResponse.data) {
                  contactsMap.set(group.id, contactsResponse.data);
                } else {
                  contactsMap.set(group.id, []);
                }
              } catch (error) {
                contactsMap.set(group.id, []);
              }
            })
          );
          this.groupContacts = contactsMap;
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

  private getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  private handleEdit() {
    if (this.person) {
      window.history.pushState({}, '', `/persons/${this.person.displayId}/edit`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  private handleBack() {
    window.history.pushState({}, '', '/persons');
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

    if (!this.person) {
      return html`
        <div class="flex min-h-full items-center justify-center py-6 pt-16">
          <p class="${textColors.tertiary}">Person not found</p>
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
                  People
                </button>
              </li>
              <li>
                <div class="flex items-center">
                  <svg class="h-5 w-5 ${textColors.muted}" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span class="ml-2 text-sm font-medium ${textColors.secondary}">${this.person.firstName} ${this.person.lastName}</span>
                </div>
              </li>
            </ol>
          </nav>

          <!-- Header -->
          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg mb-6">
            <div class="flex items-start justify-between">
              <div class="flex items-start gap-6 flex-1">
                <div class="shrink-0">
                  ${this.person.imageURL
                    ? html`
                        <img
                          src="${this.person.imageURL}"
                          alt=""
                          class="size-24 rounded-full"
                        />
                      `
                    : html`
                        <div
                          class="size-24 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-2xl"
                        >
                          ${this.getInitials(this.person.firstName, this.person.lastName)}
                        </div>
                      `}
                </div>
                <div class="flex-1">
                  <h1 class="text-3xl font-bold ${textColors.primary}">
                    ${this.person.firstName} ${this.person.lastName}
                  </h1>
                  ${this.person.pronouns
                    ? html`<p class="mt-1 text-lg ${textColors.tertiary}">${this.person.pronouns}</p>`
                    : ''}
                  
                  <div class="mt-6 pt-6 border-t ${backgroundColors.border}">
                    <contact-info-display
                      .contactInformations=${this.contactInformations}
                      .showPrivate=${this.canEdit}
                    ></contact-info-display>
                  </div>
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

            <!-- Groups -->
            <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg">
              <h3 class="text-lg font-medium ${textColors.primary} mb-4">Groups</h3>
              ${this.groups.length === 0
                ? html`
                    <p class="text-center py-8 text-sm ${textColors.tertiary}">
                      Not a member of any groups yet.
                    </p>
                  `
                : html`
                    <div class="-mx-6 -mb-8 mt-4">
                      <div class="overflow-hidden">
                        <group-list
                          .groups=${this.groups}
                          .showAdmin=${true}
                          .adminGroupIds=${this.adminGroupIds}
                          .linkToDetail=${true}
                          .showEdit=${false}
                          .isLoading=${this.isLoading}
                          .groupContacts=${this.groupContacts}
                        ></group-list>
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
    'person-detail-page': PersonDetailPage;
  }
}
