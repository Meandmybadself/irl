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
import type { Interest } from '@irl/shared';

interface CategoryGroup {
  category: string;
  interests: Interest[];
  isExpanded: boolean;
}

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
  private categoryGroups: CategoryGroup[] = [];

  @state()
  private isLoading = false;

  @state()
  private isSaving = false;

  // Category editing
  @state()
  private editingCategory: string | null = null;

  @state()
  private editingCategoryValue = '';

  // Interest editing
  @state()
  private editingInterest: number | null = null;

  @state()
  private editingInterestName = '';

  @state()
  private editingInterestCategory = '';

  // New interest form
  @state()
  private showNewInterestForm = false;

  @state()
  private newInterestName = '';

  @state()
  private newInterestCategory = '';

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is system admin
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser?.isSystemAdmin) {
      window.history.pushState({}, '', '/home');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    await this.loadInterests();
  }

  private async loadInterests() {
    this.isLoading = true;
    try {
      const response = await this.api.getInterests(undefined, { limit: 1000 });
      if (response.success && response.data) {
        // Group interests by category
        const groupMap = new Map<string, Interest[]>();

        response.data.forEach((interest) => {
          if (!groupMap.has(interest.category)) {
            groupMap.set(interest.category, []);
          }
          groupMap.get(interest.category)!.push(interest);
        });

        // Convert to array and sort
        this.categoryGroups = Array.from(groupMap.entries())
          .map(([category, interests]) => ({
            category,
            interests: interests.sort((a, b) => a.name.localeCompare(b.name)),
            isExpanded: false
          }))
          .sort((a, b) => a.category.localeCompare(b.category));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load interests',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  private toggleCategory(category: string) {
    this.categoryGroups = this.categoryGroups.map((group) =>
      group.category === category
        ? { ...group, isExpanded: !group.isExpanded }
        : group
    );
  }

  // Category operations
  private startEditingCategory(category: string) {
    this.editingCategory = category;
    this.editingCategoryValue = category;
  }

  private cancelEditingCategory() {
    this.editingCategory = null;
    this.editingCategoryValue = '';
  }

  private async saveCategory() {
    if (!this.editingCategory || !this.editingCategoryValue.trim()) {
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.renameInterestCategory(
        this.editingCategory,
        this.editingCategoryValue.trim()
      );

      if (response.success) {
        this.store.dispatch(addNotification('Category renamed successfully', 'success'));
        this.editingCategory = null;
        this.editingCategoryValue = '';
        await this.loadInterests();
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
        await this.loadInterests();
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

  // Interest operations
  private startEditingInterest(interest: Interest) {
    this.editingInterest = interest.id;
    this.editingInterestName = interest.name;
    this.editingInterestCategory = interest.category;
  }

  private cancelEditingInterest() {
    this.editingInterest = null;
    this.editingInterestName = '';
    this.editingInterestCategory = '';
  }

  private async saveInterest() {
    if (!this.editingInterest || !this.editingInterestName.trim() || !this.editingInterestCategory.trim()) {
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.updateInterest(this.editingInterest, {
        name: this.editingInterestName.trim(),
        category: this.editingInterestCategory.trim()
      });

      if (response.success) {
        this.store.dispatch(addNotification('Interest updated successfully', 'success'));
        this.editingInterest = null;
        this.editingInterestName = '';
        this.editingInterestCategory = '';
        await this.loadInterests();
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to update interest',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private async deleteInterest(interest: Interest) {
    if (
      !confirm(
        `Are you sure you want to delete the interest "${interest.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.deleteInterest(interest.id);

      if (response.success) {
        this.store.dispatch(addNotification('Interest deleted successfully', 'success'));
        await this.loadInterests();
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to delete interest',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  // New interest operations
  private showAddInterestForm() {
    this.showNewInterestForm = true;
    this.newInterestName = '';
    this.newInterestCategory = '';
  }

  private cancelNewInterest() {
    this.showNewInterestForm = false;
    this.newInterestName = '';
    this.newInterestCategory = '';
  }

  private async createInterest() {
    if (!this.newInterestName.trim() || !this.newInterestCategory.trim()) {
      this.store.dispatch(addNotification('Name and category are required', 'error'));
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.createInterest({
        name: this.newInterestName.trim(),
        category: this.newInterestCategory.trim()
      });

      if (response.success) {
        this.store.dispatch(addNotification('Interest created successfully', 'success'));
        this.showNewInterestForm = false;
        this.newInterestName = '';
        this.newInterestCategory = '';
        await this.loadInterests();
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to create interest',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private formatCategoryName(category: string): string {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private renderInterestRow(interest: Interest) {
    const isEditing = this.editingInterest === interest.id;

    if (isEditing) {
      return html`
        <tr class="${backgroundColors.pageAlt}">
          <td colspan="3" class="px-4 py-3">
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium ${textColors.secondary} mb-1">
                  Interest Name
                </label>
                <input
                  type="text"
                  .value=${this.editingInterestName}
                  @input=${(e: Event) => {
                    this.editingInterestName = (e.target as HTMLInputElement).value;
                  }}
                  @keydown=${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      this.saveInterest();
                    } else if (e.key === 'Escape') {
                      this.cancelEditingInterest();
                    }
                  }}
                  class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  ?disabled=${this.isSaving}
                  placeholder="Enter interest name"
                />
              </div>
              <div>
                <label class="block text-xs font-medium ${textColors.secondary} mb-1">
                  Category
                </label>
                <input
                  type="text"
                  .value=${this.editingInterestCategory}
                  @input=${(e: Event) => {
                    this.editingInterestCategory = (e.target as HTMLInputElement).value;
                  }}
                  @keydown=${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      this.saveInterest();
                    } else if (e.key === 'Escape') {
                      this.cancelEditingInterest();
                    }
                  }}
                  class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  ?disabled=${this.isSaving}
                  placeholder="Enter category name"
                />
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  @click=${this.saveInterest}
                  ?disabled=${this.isSaving}
                  class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  type="button"
                  @click=${this.cancelEditingInterest}
                  ?disabled=${this.isSaving}
                  class="inline-flex items-center rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm font-semibold ${textColors.primary} ring-1 ring-inset ${backgroundColors.border} hover:${backgroundColors.contentHover} disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }

    return html`
      <tr class="${backgroundColors.content}">
        <td class="whitespace-nowrap px-4 py-3 text-sm ${textColors.primary}">
          ${interest.name}
        </td>
        <td class="whitespace-nowrap px-4 py-3 text-sm ${textColors.tertiary}">
          ${this.formatCategoryName(interest.category)}
        </td>
        <td class="whitespace-nowrap px-4 py-3 text-right text-sm">
          <button
            type="button"
            @click=${() => this.startEditingInterest(interest)}
            ?disabled=${this.isSaving}
            class="text-indigo-600 hover:text-indigo-900 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit
          </button>
          <button
            type="button"
            @click=${() => this.deleteInterest(interest)}
            ?disabled=${this.isSaving}
            class="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </td>
      </tr>
    `;
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
        <div class="sm:mx-auto sm:w-full sm:max-w-5xl">
          <admin-nav currentPath="/admin/categories"></admin-nav>

          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            <div class="flex items-center justify-between mb-6">
              <p class="text-sm ${textColors.tertiary}">
                Manage interest categories and individual interests. Click on a category to expand and view/edit interests.
              </p>
              <button
                type="button"
                @click=${this.showAddInterestForm}
                ?disabled=${this.isSaving || this.showNewInterestForm}
                class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Interest
              </button>
            </div>

            ${this.showNewInterestForm
              ? html`
                  <div class="mb-6 p-4 ${backgroundColors.pageAlt} rounded-lg border ${backgroundColors.border}">
                    <h3 class="text-sm font-semibold ${textColors.primary} mb-3">Add New Interest</h3>
                    <div class="space-y-3">
                      <div>
                        <label class="block text-xs font-medium ${textColors.secondary} mb-1">
                          Interest Name
                        </label>
                        <input
                          type="text"
                          .value=${this.newInterestName}
                          @input=${(e: Event) => {
                            this.newInterestName = (e.target as HTMLInputElement).value;
                          }}
                          @keydown=${(e: KeyboardEvent) => {
                            if (e.key === 'Enter') {
                              this.createInterest();
                            } else if (e.key === 'Escape') {
                              this.cancelNewInterest();
                            }
                          }}
                          class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                          ?disabled=${this.isSaving}
                          placeholder="e.g., Hiking"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium ${textColors.secondary} mb-1">
                          Category
                        </label>
                        <input
                          type="text"
                          .value=${this.newInterestCategory}
                          @input=${(e: Event) => {
                            this.newInterestCategory = (e.target as HTMLInputElement).value;
                          }}
                          list="existing-categories"
                          @keydown=${(e: KeyboardEvent) => {
                            if (e.key === 'Enter') {
                              this.createInterest();
                            } else if (e.key === 'Escape') {
                              this.cancelNewInterest();
                            }
                          }}
                          class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                          ?disabled=${this.isSaving}
                          placeholder="e.g., outdoor_activities or create a new category"
                        />
                        <datalist id="existing-categories">
                          ${this.categoryGroups.map(
                            (group) => html`<option value="${group.category}"></option>`
                          )}
                        </datalist>
                      </div>
                      <div class="flex gap-2">
                        <button
                          type="button"
                          @click=${this.createInterest}
                          ?disabled=${this.isSaving}
                          class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Create Interest
                        </button>
                        <button
                          type="button"
                          @click=${this.cancelNewInterest}
                          ?disabled=${this.isSaving}
                          class="inline-flex items-center rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm font-semibold ${textColors.primary} ring-1 ring-inset ${backgroundColors.border} hover:${backgroundColors.contentHover} disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                `
              : ''}

            ${this.categoryGroups.length === 0
              ? html`
                  <p class="text-sm ${textColors.tertiary} text-center py-8">
                    No interests found. Click "Add Interest" to create your first interest.
                  </p>
                `
              : html`
                  <div class="space-y-2">
                    ${this.categoryGroups.map(
                      (group) => html`
                        <div class="border ${backgroundColors.border} rounded-lg overflow-hidden">
                          <!-- Category Header -->
                          <div class="${backgroundColors.pageAlt} px-4 py-3 flex items-center justify-between">
                            <button
                              type="button"
                              @click=${() => this.toggleCategory(group.category)}
                              class="flex-1 flex items-center gap-2 text-left"
                            >
                              <svg
                                class="h-5 w-5 ${textColors.tertiary} transform transition-transform ${group.isExpanded
                                  ? 'rotate-90'
                                  : ''}"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              ${this.editingCategory === group.category
                                ? html`
                                    <input
                                      type="text"
                                      .value=${this.editingCategoryValue}
                                      @input=${(e: Event) => {
                                        this.editingCategoryValue = (e.target as HTMLInputElement).value;
                                      }}
                                      @click=${(e: Event) => e.stopPropagation()}
                                      @keydown=${(e: KeyboardEvent) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') {
                                          this.saveCategory();
                                        } else if (e.key === 'Escape') {
                                          this.cancelEditingCategory();
                                        }
                                      }}
                                      class="block rounded-md ${backgroundColors.content} px-3 py-1 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                                      ?disabled=${this.isSaving}
                                    />
                                  `
                                : html`
                                    <span class="font-semibold ${textColors.primary}">
                                      ${this.formatCategoryName(group.category)}
                                    </span>
                                    <span class="text-sm ${textColors.tertiary}">
                                      (${group.interests.length} interest${group.interests.length !== 1 ? 's' : ''})
                                    </span>
                                  `}
                            </button>
                            <div class="flex items-center gap-2">
                              ${this.editingCategory === group.category
                                ? html`
                                    <button
                                      type="button"
                                      @click=${(e: Event) => {
                                        e.stopPropagation();
                                        this.saveCategory();
                                      }}
                                      ?disabled=${this.isSaving}
                                      class="text-sm text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      @click=${(e: Event) => {
                                        e.stopPropagation();
                                        this.cancelEditingCategory();
                                      }}
                                      ?disabled=${this.isSaving}
                                      class="text-sm ${textColors.tertiary} hover:${textColors.primary} disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Cancel
                                    </button>
                                  `
                                : html`
                                    <button
                                      type="button"
                                      @click=${(e: Event) => {
                                        e.stopPropagation();
                                        this.startEditingCategory(group.category);
                                      }}
                                      ?disabled=${this.isSaving}
                                      class="text-sm text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Rename
                                    </button>
                                    <button
                                      type="button"
                                      @click=${(e: Event) => {
                                        e.stopPropagation();
                                        this.deleteCategory(group.category);
                                      }}
                                      ?disabled=${this.isSaving}
                                      class="text-sm text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Delete
                                    </button>
                                  `}
                            </div>
                          </div>

                          <!-- Interests Table -->
                          ${group.isExpanded
                            ? html`
                                <table class="min-w-full divide-y ${backgroundColors.border}">
                                  <thead class="${backgroundColors.pageAlt}">
                                    <tr>
                                      <th
                                        scope="col"
                                        class="px-4 py-2 text-left text-xs font-semibold ${textColors.secondary}"
                                      >
                                        Interest Name
                                      </th>
                                      <th
                                        scope="col"
                                        class="px-4 py-2 text-left text-xs font-semibold ${textColors.secondary}"
                                      >
                                        Category
                                      </th>
                                      <th scope="col" class="relative px-4 py-2">
                                        <span class="sr-only">Actions</span>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody class="divide-y ${backgroundColors.border}">
                                    ${group.interests.map((interest) => this.renderInterestRow(interest))}
                                  </tbody>
                                </table>
                              `
                            : ''}
                        </div>
                      `
                    )}
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
