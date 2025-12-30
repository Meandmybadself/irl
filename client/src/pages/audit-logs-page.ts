import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import { textColors, backgroundColors } from '../utilities/text-colors.js';
import '../components/layout/admin-nav.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { AuditLog } from '@irl/shared';

@customElement('audit-logs-page')
export class AuditLogsPage extends LitElement {
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
  private logs: AuditLog[] = [];

  @state()
  private isLoading = false;

  @state()
  private currentPage = 1;

  @state()
  private totalPages = 1;

  @state()
  private total = 0;

  @state()
  private limit = 50;

  @state()
  private filterMethod = '';

  @state()
  private filterPath = '';

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is system admin
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser?.isSystemAdmin) {
      window.history.pushState({}, '', '/home');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    await this.loadLogs();
  }

  private async loadLogs() {
    this.isLoading = true;
    try {
      const response = await this.api.getAuditLogs({
        page: this.currentPage,
        limit: this.limit,
        method: this.filterMethod || undefined,
        path: this.filterPath || undefined
      });

      if (response.success && response.data) {
        this.logs = response.data;
        this.total = response.pagination?.total || 0;
        this.totalPages = response.pagination?.totalPages || 1;
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load audit logs',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  private async handlePageChange(page: number) {
    this.currentPage = page;
    await this.loadLogs();
  }

  private async handleFilterChange() {
    this.currentPage = 1;
    await this.loadLogs();
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  private getMethodColor(method: string): string {
    switch (method) {
      case 'GET':
        return 'text-blue-600 dark:text-blue-400';
      case 'POST':
        return 'text-green-600 dark:text-green-400';
      case 'PUT':
      case 'PATCH':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'DELETE':
        return 'text-red-600 dark:text-red-400';
      default:
        return textColors.primary;
    }
  }

  private getStatusColor(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) {
      return 'text-green-600 dark:text-green-400';
    } else if (statusCode >= 400 && statusCode < 500) {
      return 'text-yellow-600 dark:text-yellow-400';
    } else if (statusCode >= 500) {
      return 'text-red-600 dark:text-red-400';
    }
    return textColors.primary;
  }

  render() {
    if (this.isLoading && this.logs.length === 0) {
      return html`
        <div class="flex min-h-full items-center justify-center py-6 pt-16">
          <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
        </div>
      `;
    }

    return html`
      <div class="flex min-h-full flex-col py-6 sm:px-6 lg:px-8 pt-16">
        <div class="sm:mx-auto sm:w-full sm:max-w-7xl">
          <admin-nav currentPath="/admin/logs"></admin-nav>

          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg">
            <!-- Filters -->
            <div class="mb-6 flex gap-4 items-end">
              <div class="flex-1">
                <label for="filter-method" class="block text-sm font-medium ${textColors.primary} mb-2">
                  Method
                </label>
                <select
                  id="filter-method"
                  .value=${this.filterMethod}
                  @change=${(e: Event) => {
                    this.filterMethod = (e.target as HTMLSelectElement).value;
                  }}
                  class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                >
                  <option value="">All Methods</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div class="flex-1">
                <label for="filter-path" class="block text-sm font-medium ${textColors.primary} mb-2">
                  Path (contains)
                </label>
                <input
                  id="filter-path"
                  type="text"
                  .value=${this.filterPath}
                  @input=${(e: Event) => {
                    this.filterPath = (e.target as HTMLInputElement).value;
                  }}
                  placeholder="e.g., /api/persons"
                  class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                />
              </div>
              <button
                type="button"
                @click=${this.handleFilterChange}
                class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Apply Filters
              </button>
            </div>

            <p class="text-sm ${textColors.tertiary} mb-4">
              Showing ${this.logs.length} of ${this.total} audit log${this.total !== 1 ? 's' : ''}
            </p>

            ${this.logs.length === 0
              ? html`
                  <p class="text-sm ${textColors.tertiary} text-center py-8">
                    No audit logs found.
                  </p>
                `
              : html`
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y ${backgroundColors.border}">
                      <thead class="${backgroundColors.pageAlt}">
                        <tr>
                          <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold ${textColors.primary} sm:pl-6">
                            Timestamp
                          </th>
                          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold ${textColors.primary}">
                            User
                          </th>
                          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold ${textColors.primary}">
                            Method
                          </th>
                          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold ${textColors.primary}">
                            Path
                          </th>
                          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold ${textColors.primary}">
                            Status
                          </th>
                          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold ${textColors.primary}">
                            IP Address
                          </th>
                        </tr>
                      </thead>
                      <tbody class="${backgroundColors.content} divide-y ${backgroundColors.border}">
                        ${this.logs.map(
                          (log) => html`
                            <tr>
                              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm ${textColors.primary} sm:pl-6">
                                ${this.formatDate(log.createdAt)}
                              </td>
                              <td class="whitespace-nowrap px-3 py-4 text-sm ${textColors.primary}">
                                ${log.user ? log.user.email : html`<span class="${textColors.tertiary}">N/A</span>`}
                              </td>
                              <td class="whitespace-nowrap px-3 py-4 text-sm font-semibold ${this.getMethodColor(log.method)}">
                                ${log.method}
                              </td>
                              <td class="px-3 py-4 text-sm ${textColors.primary} font-mono text-xs">
                                ${log.path}
                              </td>
                              <td class="whitespace-nowrap px-3 py-4 text-sm font-semibold ${this.getStatusColor(log.statusCode)}">
                                ${log.statusCode}
                              </td>
                              <td class="whitespace-nowrap px-3 py-4 text-sm ${textColors.tertiary}">
                                ${log.ipAddress || 'N/A'}
                              </td>
                            </tr>
                          `
                        )}
                      </tbody>
                    </table>
                  </div>

                  <!-- Pagination -->
                  ${this.totalPages > 1
                    ? html`
                        <div class="flex items-center justify-between border-t ${backgroundColors.border} px-4 py-3 sm:px-6 mt-4">
                          <div class="flex flex-1 justify-between sm:hidden">
                            <button
                              @click=${() => this.handlePageChange(this.currentPage - 1)}
                              ?disabled=${this.currentPage === 1}
                              class="relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${textColors.primary} ${backgroundColors.content} ring-1 ring-inset ${backgroundColors.border} hover:${backgroundColors.contentHover} disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              @click=${() => this.handlePageChange(this.currentPage + 1)}
                              ?disabled=${this.currentPage === this.totalPages}
                              class="relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${textColors.primary} ${backgroundColors.content} ring-1 ring-inset ${backgroundColors.border} hover:${backgroundColors.contentHover} disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                              <p class="text-sm ${textColors.primary}">
                                Page <span class="font-medium">${this.currentPage}</span> of
                                <span class="font-medium">${this.totalPages}</span>
                              </p>
                            </div>
                            <div>
                              <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                  @click=${() => this.handlePageChange(this.currentPage - 1)}
                                  ?disabled=${this.currentPage === 1}
                                  class="relative inline-flex items-center rounded-l-md px-2 py-2 ${textColors.secondary} ring-1 ring-inset ${backgroundColors.border} hover:${backgroundColors.contentHover} disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <span class="sr-only">Previous</span>
                                  ←
                                </button>
                                <button
                                  @click=${() => this.handlePageChange(this.currentPage + 1)}
                                  ?disabled=${this.currentPage === this.totalPages}
                                  class="relative inline-flex items-center rounded-r-md px-2 py-2 ${textColors.secondary} ring-1 ring-inset ${backgroundColors.border} hover:${backgroundColors.contentHover} disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <span class="sr-only">Next</span>
                                  →
                                </button>
                              </nav>
                            </div>
                          </div>
                        </div>
                      `
                    : ''}
                `}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'audit-logs-page': AuditLogsPage;
  }
}
