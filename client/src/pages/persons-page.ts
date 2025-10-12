import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { Person } from '@irl/shared';

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
  private isLoading = false;

  @state()
  private currentPage = 1;

  @state()
  private totalPages = 1;

  private limit = 10;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadPersons();
  }

  private async loadPersons() {
    this.isLoading = true;
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

  private handleEditPerson(id: number) {
    window.history.pushState({}, '', `/persons/${id}/edit`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
      <nav class="flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 mt-8">
        <div class="-mt-px flex w-0 flex-1">
          ${this.currentPage > 1
            ? html`
                <button
                  @click=${() => this.handlePageChange(this.currentPage - 1)}
                  class="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 bg-transparent cursor-pointer"
                >
                  <svg class="mr-3 size-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
              ? html`<span class="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500">...</span>`
              : html`
                  <button
                    @click=${() => this.handlePageChange(page)}
                    class="inline-flex items-center border-t-2 px-4 pt-4 text-sm font-medium bg-transparent cursor-pointer ${
                      page === this.currentPage
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
                  class="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 bg-transparent cursor-pointer"
                >
                  Next
                  <svg class="ml-3 size-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
    if (this.isLoading && this.persons.length === 0) {
      return html`
        <div class="flex min-h-full items-center justify-center py-12 pt-20">
          <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
        </div>
      `;
    }

    return html`
      <div class="flex min-h-full flex-col py-12 sm:px-6 lg:px-8 pt-20">
        <div class="px-4 sm:px-6 lg:px-8">
          <div class="sm:flex sm:items-center">
            <div class="sm:flex-auto">
              <h1 class="text-base font-semibold text-gray-900">People</h1>
              <p class="mt-2 text-sm text-gray-700">
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

          ${this.persons.length === 0
            ? html`
                <div class="mt-8 text-center py-12">
                  <p class="text-sm text-gray-500">No people found. Create your first person to get started.</p>
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
                <div class="mt-8 flow-root">
                  <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                      <table class="relative min-w-full divide-y divide-gray-300">
                        <thead>
                          <tr>
                            <th scope="col" class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                              Name
                            </th>
                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Display ID
                            </th>
                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Pronouns
                            </th>
                            <th scope="col" class="py-3.5 pr-4 pl-3 sm:pr-0">
                              <span class="sr-only">Edit</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 bg-white">
                          ${this.persons.map(
                            person => html`
                              <tr>
                                <td class="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                                  <div class="flex items-center">
                                    <div class="size-11 shrink-0">
                                      ${person.imageURL
                                        ? html`
                                            <img
                                              src="${person.imageURL}"
                                              alt=""
                                              class="size-11 rounded-full"
                                            />
                                          `
                                        : html`
                                            <div
                                              class="size-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-sm"
                                            >
                                              ${this.getInitials(person.firstName, person.lastName)}
                                            </div>
                                          `}
                                    </div>
                                    <div class="ml-4">
                                      <div class="font-medium text-gray-900">
                                        ${person.firstName} ${person.lastName}
                                      </div>
                                      <div class="mt-1 text-gray-500">ID: ${person.id}</div>
                                    </div>
                                  </div>
                                </td>
                                <td class="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                                  <div class="text-gray-900">${person.displayId}</div>
                                </td>
                                <td class="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                                  ${person.pronouns || html`<span class="text-gray-400">—</span>`}
                                </td>
                                <td class="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                                  <button
                                    @click=${() => this.handleEditPerson(person.id)}
                                    class="text-indigo-600 hover:text-indigo-900 bg-transparent border-none cursor-pointer"
                                  >
                                    Edit<span class="sr-only">, ${person.firstName} ${person.lastName}</span>
                                  </button>
                                </td>
                              </tr>
                            `
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                ${this.renderPagination()}
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
