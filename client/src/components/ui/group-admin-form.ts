import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { apiContext } from '../../contexts/api-context.js';
import type { ApiClient } from '../../services/api-client.js';
import type { Person, PersonGroupWithRelations } from '@irl/shared';
import './person-search.js';

@customElement('group-admin-form')
export class GroupAdminForm extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @property({ type: Number })
  groupId!: number;

  @property({ type: String })
  groupDisplayId!: string;

  @state()
  private admins: PersonGroupWithRelations[] = [];

  @state()
  private isLoading = false;

  @state()
  private isAdding = false;

  @state()
  private showAddForm = false;

  @state()
  private selectedPerson: Person | null = null;

  @state()
  private relation = '';

  async connectedCallback() {
    super.connectedCallback();
    await this.loadAdmins();
  }

  private async loadAdmins() {
    if (!this.groupId) return;

    this.isLoading = true;
    try {
      const response = await this.api.getPersonGroups();
      if (response.success && response.data) {
        // Filter for this group's admins - API now includes person and group details
        this.admins = response.data.filter(
          pg => pg.groupId === this.groupId && pg.isAdmin
        ) as PersonGroupWithRelations[];
      }
    } catch (error) {
      console.error('Failed to load admins:', error);
      this.dispatchEvent(
        new CustomEvent('admin-error', {
          detail: { error: 'Failed to load administrators' },
          bubbles: true,
          composed: true
        })
      );
    } finally {
      this.isLoading = false;
    }
  }

  private handlePersonSelected(e: CustomEvent) {
    this.selectedPerson = e.detail.person;
  }

  private handlePersonCleared() {
    this.selectedPerson = null;
  }

  private handleRelationInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.relation = target.value;
  }

  private async handleAddAdmin(e: Event) {
    e.preventDefault();

    if (!this.selectedPerson) {
      this.dispatchEvent(
        new CustomEvent('admin-error', {
          detail: { error: 'Please select a person' },
          bubbles: true,
          composed: true
        })
      );
      return;
    }

    if (!this.relation.trim()) {
      this.dispatchEvent(
        new CustomEvent('admin-error', {
          detail: { error: 'Please specify a relation' },
          bubbles: true,
          composed: true
        })
      );
      return;
    }

    this.isAdding = true;
    try {
      const response = await this.api.createPersonGroup({
        personId: this.selectedPerson.id,
        groupId: this.groupId,
        relation: this.relation.trim(),
        isAdmin: true
      });

      if (response.success) {
        this.dispatchEvent(
          new CustomEvent('admin-added', {
            detail: { admin: response.data },
            bubbles: true,
            composed: true
          })
        );

        // Reset form
        this.selectedPerson = null;
        this.relation = '';
        this.showAddForm = false;

        // Reload admins
        await this.loadAdmins();
      }
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('admin-error', {
          detail: {
            error: `Failed to add administrator: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          bubbles: true,
          composed: true
        })
      );
    } finally {
      this.isAdding = false;
    }
  }

  private async handleRemoveAdmin(admin: PersonGroupWithRelations) {
    if (!confirm('Are you sure you want to remove this administrator?')) {
      return;
    }

    try {
      const response = await this.api.deletePersonGroup(admin.id);
      if (response.success) {
        this.dispatchEvent(
          new CustomEvent('admin-removed', {
            detail: { adminId: admin.id },
            bubbles: true,
            composed: true
          })
        );

        // Reload admins
        await this.loadAdmins();
      }
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('admin-error', {
          detail: {
            error: `Failed to remove administrator: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  private toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.selectedPerson = null;
      this.relation = '';
    }
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="border-t border-gray-200 pt-6 mt-6">
          <h3 class="text-base font-semibold text-gray-900 mb-4">Group Administrators</h3>
          <div class="flex items-center justify-center py-8">
            <div class="inline-block w-6 h-6 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="border-t border-gray-200 pt-6 mt-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-gray-900">Group Administrators</h3>
          <button
            type="button"
            @click=${this.toggleAddForm}
            class="inline-flex items-center px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Administrator
          </button>
        </div>

        ${this.admins.length === 0
          ? html`
              <p class="text-sm text-gray-500 italic py-4">
                No administrators assigned yet. The group creator is automatically assigned as the first
                administrator.
              </p>
            `
          : html`
              <ul class="divide-y divide-gray-200 border border-gray-200 rounded-md">
                ${this.admins.map(
                  admin => html`
                    <li class="flex items-center justify-between py-3 px-4">
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">
                          ${admin.person
                            ? `${admin.person.firstName} ${admin.person.lastName}`
                            : `Person ID: ${admin.personId}`}
                        </p>
                        <p class="text-sm text-gray-500">
                          ${admin.relation}
                          ${admin.person?.displayId
                            ? html` <span class="text-gray-400">• @${admin.person.displayId}</span>`
                            : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        @click=${() => this.handleRemoveAdmin(admin)}
                        class="ml-4 text-sm text-red-600 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </li>
                  `
                )}
              </ul>
            `}

        ${this.showAddForm
          ? html`
              <div class="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <h4 class="text-sm font-medium text-gray-900 mb-3">Add New Administrator</h4>
                <form @submit=${this.handleAddAdmin} class="space-y-4">
                  <person-search
                    label="Select Person"
                    placeholder="Search for a person to add as admin..."
                    .selectedPerson=${this.selectedPerson}
                    .excludePersonIds=${this.admins.map(a => a.personId)}
                    @person-selected=${this.handlePersonSelected}
                    @person-cleared=${this.handlePersonCleared}
                  ></person-search>

                  <div>
                    <label for="admin-relation" class="block text-sm font-medium text-gray-900 mb-2">
                      Relation/Role
                    </label>
                    <input
                      id="admin-relation"
                      type="text"
                      .value=${this.relation}
                      placeholder="e.g., Administrator, Moderator, Co-organizer"
                      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      @input=${this.handleRelationInput}
                      required
                    />
                  </div>

                  <div class="flex gap-2">
                    <button
                      type="submit"
                      ?disabled=${this.isAdding}
                      class="flex-1 inline-flex justify-center items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                    >
                      ${this.isAdding
                        ? html`<span
                            class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"
                          ></span>`
                        : ''}
                      Add Administrator
                    </button>
                    <button
                      type="button"
                      @click=${this.toggleAddForm}
                      class="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-admin-form': GroupAdminForm;
  }
}
