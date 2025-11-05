import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { textColors, backgroundColors } from '../utilities/text-colors.js';

import '../components/ui/person-list.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { Person, ContactInformation } from '@irl/shared';
import { DEFAULT_PAGE_LIMIT } from '@irl/shared';

@customElement('persons-page')
export class PersonsPage extends LitElement {
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
  private persons: Person[] = [];

  @state()
  private personContacts: Map<number, ContactInformation[]> = new Map();

  @state()
  private isLoading = false;

  @state()
  private currentPage = 1;

  @state()
  private totalPages = 1;

  private limit = DEFAULT_PAGE_LIMIT;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadPersons();
  }

  private async loadPersons() {
    this.isLoading = true;
    this.personContacts = new Map();
    try {
      const response = await this.api.getPersons({
        page: this.currentPage,
        limit: this.limit
      });

      if (response.success && response.data) {
        this.persons = response.data;
        if (response.pagination) {
          this.totalPages = response.pagination.totalPages;
        }

        // Load contact information for each person
        const contactsMap = new Map<number, ContactInformation[]>();
        await Promise.all(
          this.persons.map(async (person) => {
            try {
              const contactsResponse = await this.api.getPersonContactInformations(person.displayId);
              if (contactsResponse.success && contactsResponse.data) {
                contactsMap.set(person.id, contactsResponse.data);
              }
            } catch (err) {
              // Silently fail for individual contact fetches
              contactsMap.set(person.id, []);
            }
          })
        );
        this.personContacts = contactsMap;
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load persons',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  private async handlePageChange(page: number) {
    this.currentPage = page;
    await this.loadPersons();
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private handleCreatePerson() {
    window.history.pushState({}, '', '/persons/create');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private renderPagination() {
    if (this.totalPages <= 1) return '';

    const pages: number[] = [];
    const maxVisible = 5;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        pages.push(1, 2, 3, 4, -1, this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1, -1, this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages);
      } else {
        pages.push(1, -1, this.currentPage - 1, this.currentPage, this.currentPage + 1, -1, this.totalPages);
      }
    }

    return html`
      <nav class="flex items-center justify-between border-t ${backgroundColors.border} px-4 sm:px-0 mt-8">
        <div class="-mt-px flex w-0 flex-1">
          ${this.currentPage > 1
            ? html`
                <button
                  @click=${() => this.handlePageChange(this.currentPage - 1)}
                  class="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium ${textColors.tertiary} hover:border-gray-300 dark:hover:border-gray-600 ${textColors.secondary} bg-transparent cursor-pointer"
                >
                  <svg class="mr-3 size-5 ${textColors.muted}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M18 10a.75.75 0 01-.75.75H4.66l2.1 1.95a.75.75 0 11-1.02 1.1l-3.5-3.25a.75.75 0 010-1.1l3.5-3.25a.75.75 0 111.02 1.1l-2.1 1.95h12.59A.75.75 0 0118 10z" clip-rule="evenodd" />
                  </svg>
                  Previous
                </button>
              `
            : ''}
        </div>
        <div class="hidden md:-mt-px md:flex">
          ${pages.map(page =>
            page === -1
              ? html`<span class="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium ${textColors.tertiary}">...</span>`
              : html`
                  <button
                    @click=${() => this.handlePageChange(page)}
                    class="inline-flex items-center border-t-2 px-4 pt-4 text-sm font-medium bg-transparent cursor-pointer ${
                      page === this.currentPage
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : `border-transparent ${textColors.tertiary} hover:border-gray-300 dark:hover:border-gray-600 ${textColors.secondary}`
                    }"
                  >
                    ${page}
                  </button>
                `
          )}
        </div>
        <div class="-mt-px flex w-0 flex-1 justify-end">
          ${this.currentPage < this.totalPages
            ? html`
                <button
                  @click=${() => this.handlePageChange(this.currentPage + 1)}
                  class="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium ${textColors.tertiary} hover:border-gray-300 dark:hover:border-gray-600 ${textColors.secondary} bg-transparent cursor-pointer"
                >
                  Next
                  <svg class="ml-3 size-5 ${textColors.muted}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" clip-rule="evenodd" />
                  </svg>
                </button>
              `
            : ''}
        </div>
      </nav>
    `;
  }

  render() {
    const hasPersons = this.persons.length > 0;

    return html`
      <div class="flex min-h-full flex-col py-6 pt-16">
        <div class="px-4 sm:px-6 lg:px-8">
          <div class="sm:flex sm:items-center">
            <div class="sm:flex-auto">
              <h1 class="text-base font-semibold ${textColors.primary}">People</h1>
              <p class="mt-2 text-sm ${textColors.secondary}">
                A list of all people in your directory including their name and profile information.
              </p>
            </div>
            <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                type="button"
                @click=${this.handleCreatePerson}
                class="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Add person
              </button>
            </div>
          </div>

          ${!hasPersons && !this.isLoading
            ? html`
                <div class="mt-8 text-center py-12">
                  <p class="text-sm ${textColors.tertiary}">No people found. Create your first person to get started.</p>
                  <button
                    type="button"
                    @click=${this.handleCreatePerson}
                    class="mt-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
                  >
                    Add person
                  </button>
                </div>
              `
            : html`
                <div class="mt-8 flow-root relative">
                  ${this.isLoading && hasPersons
                    ? html`
                        <div class="absolute inset-0 ${backgroundColors.overlay} flex items-center justify-center z-10">
                          <div class="inline-block h-6 w-6 rounded-full border-2 border-indigo-600 border-r-transparent animate-spin"></div>
                        </div>
                      `
                    : ''}
                  <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                      <person-list
                        .persons=${this.persons}
                        .linkToDetail=${true}
                        .showEdit=${true}
                        .isLoading=${this.isLoading}
                        .personContacts=${this.personContacts}
                      ></person-list>
                    </div>
                  </div>
                </div>
                ${hasPersons ? this.renderPagination() : ''}
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'persons-page': PersonsPage;
  }
}
