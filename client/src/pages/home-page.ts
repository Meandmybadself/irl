import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { selectCurrentUser } from '../store/selectors.js';
import { addNotification } from '../store/slices/ui.js';
import { textColors, backgroundColors } from '../utilities/text-colors.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { Person, Group, ContactInformation } from '@irl/shared';
import '../components/layout/app-layout.js';
import '../components/ui/unified-search-list.js';

@customElement('home-page')
export class HomePage extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext, subscribe: true })
  @state()
  private store!: AppStore;

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @state()
  private persons: Person[] = [];

  @state()
  private groups: Group[] = [];

  @state()
  private personContacts: Map<number, ContactInformation[]> = new Map();

  @state()
  private groupContacts: Map<number, ContactInformation[]> = new Map();

  @state()
  private isLoading = false;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadData();
  }

  private async loadData() {
    this.isLoading = true;
    try {
      // Load persons and groups in parallel
      const [personsResponse, groupsResponse] = await Promise.all([
        this.api.getPersons({ limit: 100 }),
        this.api.getGroups(1, 100)
      ]);

      if (personsResponse.success && personsResponse.data) {
        this.persons = personsResponse.data;

        // Load contact information for all persons
        const personContactPromises = this.persons.map(async (person) => {
          try {
            const contactsResponse = await this.api.getPersonContactInformations(person.displayId);
            if (contactsResponse.success && contactsResponse.data) {
              this.personContacts.set(person.id, contactsResponse.data);
            }
          } catch (error) {
            // Silently fail for individual contact fetches
            console.error(`Failed to load contacts for person ${person.displayId}:`, error);
          }
        });

        await Promise.all(personContactPromises);
      }

      if (groupsResponse.success && groupsResponse.data) {
        this.groups = groupsResponse.data;

        // Load contact information for all groups
        const groupContactPromises = this.groups.map(async (group) => {
          try {
            const contactsResponse = await this.api.getGroupContactInformations(group.displayId);
            if (contactsResponse.success && contactsResponse.data) {
              this.groupContacts.set(group.id, contactsResponse.data);
            }
          } catch (error) {
            // Silently fail for individual contact fetches
            console.error(`Failed to load contacts for group ${group.displayId}:`, error);
          }
        });

        await Promise.all(groupContactPromises);
      }

      // Trigger re-render with updated maps
      this.requestUpdate();
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load data',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  render() {
    const currentUser = selectCurrentUser(this.store.getState());
    const canViewPrivateContacts = currentUser?.isSystemAdmin || false;

    return html`
      <app-layout>
        <div class="${backgroundColors.content} rounded-lg shadow-sm p-6 mb-6">
          ${this.isLoading
            ? html`
                <div class="flex items-center justify-center py-12">
                  <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
                </div>
              `
            : html`
                <unified-search-list
                  .persons=${this.persons}
                  .groups=${this.groups}
                  .personContacts=${this.personContacts}
                  .groupContacts=${this.groupContacts}
                  .showPrivateContacts=${canViewPrivateContacts}
                ></unified-search-list>
              `}
        </div>


      </app-layout>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'home-page': HomePage;
  }
}
