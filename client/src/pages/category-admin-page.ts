import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import { textColors, backgroundColors } from '../utilities/text-colors.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';

@customElement('category-admin-page')
export class CategoryAdminPage extends LitElement {
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
  private categories: string[] = [];

  @state()
  private isLoading = false;

  @state()
  private editingCategory: string | null = null;

  @state()
  private editingValue = '';

  @state()
  private isSaving = false;

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is system admin
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser?.isSystemAdmin) {
      window.history.pushState({}, '', '/home');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    await this.loadCategories();
  }

  private async loadCategories() {
    this.isLoading = true;
    try {
      const response = await this.api.getInterestCategories();
      if (response.success && response.data) {
        this.categories = response.data;
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load categories',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  private startEditing(category: string) {
    this.editingCategory = category;
    this.editingValue = category;
  }

  private cancelEditing() {
    this.editingCategory = null;
    this.editingValue = '';
  }

  private async saveCategory() {
    if (!this.editingCategory || !this.editingValue.trim()) {
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.renameInterestCategory(
        this.editingCategory,
        this.editingValue.trim()
      );

      if (response.success) {
        this.store.dispatch(addNotification('Category renamed successfully', 'success'));
        this.editingCategory = null;
        this.editingValue = '';
        await this.loadCategories();
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to rename category',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private async deleteCategory(category: string) {
    if (
      !confirm(
        `Are you sure you want to delete the category "${category}"? This will delete all interests in this category. This action cannot be undone.`
      )
    ) {
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.deleteInterestCategory(category);

      if (response.success) {
        this.store.dispatch(
          addNotification('Category and all its interests deleted successfully', 'success')
        );
        await this.loadCategories();
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to delete category',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private handleBack() {
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private formatCategoryName(category: string): string {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
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
        <div class="sm:mx-auto sm:w-full sm:max-w-3xl">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl/9 font-bold tracking-tight ${textColors.primary}">
              Interest Categories
            </h2>
            <button
              @click=${this.handleBack}
              class="text-sm font-semibold ${textColors.link} ${textColors.linkHover}"
            >
              ← Back to System Admin
            </button>
          </div>

          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            ${this.categories.length === 0
              ? html`
                  <p class="text-sm ${textColors.tertiary} text-center py-8">
                    No categories found. Categories are created when interests are added.
                  </p>
                `
              : html`
                  <div class="space-y-4">
                    <p class="text-sm ${textColors.tertiary}">
                      Manage interest categories. Renaming a category will update all interests in that category. Deleting a category will delete all its interests.
                    </p>

                    <div class="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
                      <table class="min-w-full divide-y ${backgroundColors.border}">
                        <thead class="${backgroundColors.pageAlt}">
                          <tr>
                            <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold ${textColors.primary} sm:pl-6">
                              Category Name
                            </th>
                            <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                              <span class="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody class="${backgroundColors.content} divide-y ${backgroundColors.border}">
                          ${this.categories.map(
                            (category) => html`
                              <tr>
                                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm ${textColors.primary} sm:pl-6">
                                  ${this.editingCategory === category
                                    ? html`
                                        <input
                                          type="text"
                                          .value=${this.editingValue}
                                          @input=${(e: Event) => {
                                            this.editingValue = (e.target as HTMLInputElement).value;
                                          }}
                                          @keydown=${(e: KeyboardEvent) => {
                                            if (e.key === 'Enter') {
                                              this.saveCategory();
                                            } else if (e.key === 'Escape') {
                                              this.cancelEditing();
                                            }
                                          }}
                                          class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                                          ?disabled=${this.isSaving}
                                        />
                                      `
                                    : html`
                                        <span class="font-medium">${this.formatCategoryName(category)}</span>
                                        <span class="ml-2 text-xs ${textColors.tertiary}">(${category})</span>
                                      `}
                                </td>
                                <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                  ${this.editingCategory === category
                                    ? html`
                                        <button
                                          type="button"
                                          @click=${this.saveCategory}
                                          ?disabled=${this.isSaving}
                                          class="text-indigo-600 hover:text-indigo-900 mr-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          @click=${this.cancelEditing}
                                          ?disabled=${this.isSaving}
                                          class="${textColors.tertiary} hover:${textColors.primary} disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Cancel
                                        </button>
                                      `
                                    : html`
                                        <button
                                          type="button"
                                          @click=${() => this.startEditing(category)}
                                          ?disabled=${this.isSaving}
                                          class="text-indigo-600 hover:text-indigo-900 mr-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Rename
                                        </button>
                                        <button
                                          type="button"
                                          @click=${() => this.deleteCategory(category)}
                                          ?disabled=${this.isSaving}
                                          class="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Delete
                                        </button>
                                      `}
                                </td>
                              </tr>
                            `
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'category-admin-page': CategoryAdminPage;
  }
}
