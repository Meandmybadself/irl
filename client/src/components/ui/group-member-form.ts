import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { apiContext } from '../../contexts/api-context.js';
import type { ApiClient } from '../../services/api-client.js';
import type { Person, PersonGroupWithRelations } from '@irl/shared';
import './person-search.js';

@customElement('group-member-form')
export class GroupMemberForm extends LitElement {
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

  @property({ type: Array })
  excludePersonIds: number[] = [];

  @state()
  private members: PersonGroupWithRelations[] = [];

  @state()
  private isLoading = false;

  @state()
  private isAdding = false;

  @state()
  private showAddForm = false;

  @state()
  private selectedPerson: Person | null = null;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadMembers();
  }

  private async loadMembers() {
    if (!this.groupDisplayId || !this.groupId) return;

    this.isLoading = true;
    try {
      const response = await this.api.getPersonGroupsByGroup(this.groupDisplayId);
      if (response.success && response.data) {
        // Filter for non-admin members
        this.members = response.data.filter(pg => !pg.isAdmin) as PersonGroupWithRelations[];
      }
    } catch (error) {
      console.error('Failed to load members:', error);
      this.dispatchEvent(
        new CustomEvent('member-error', {
          detail: { error: 'Failed to load members' },
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

  private async handleAddMember(e: Event) {
    e.preventDefault();

    if (!this.selectedPerson) {
      this.dispatchEvent(
        new CustomEvent('member-error', {
          detail: { error: 'Please select a person' },
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
        isAdmin: false
      });

      if (response.success) {
        this.dispatchEvent(
          new CustomEvent('member-added', {
            detail: { member: response.data },
            bubbles: true,
            composed: true
          })
        );

        // Reset form
        this.selectedPerson = null;
        this.showAddForm = false;

        // Reload members
        await this.loadMembers();
      }
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('member-error', {
          detail: {
            error: `Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          bubbles: true,
          composed: true
        })
      );
    } finally {
      this.isAdding = false;
    }
  }

  private async handleRemoveMember(member: PersonGroupWithRelations) {
    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return;
    }

    try {
      const response = await this.api.deletePersonGroup(member.id);
      if (response.success) {
        this.dispatchEvent(
          new CustomEvent('member-removed', {
            detail: { memberId: member.id },
            bubbles: true,
            composed: true
          })
        );

        // Reload members
        await this.loadMembers();
      }
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('member-error', {
          detail: {
            error: `Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    }
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="border-t border-gray-200 pt-6 mt-6">
          <h3 class="text-base font-semibold text-gray-900 mb-4">Group Members</h3>
          <div class="flex items-center justify-center py-8">
            <div class="inline-block w-6 h-6 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="border-t border-gray-200 pt-6 mt-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-gray-900">Group Members</h3>
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
            Add Member
          </button>
        </div>

        ${this.members.length === 0
          ? html`
              <p class="text-sm text-gray-500 italic py-4">
                No members assigned yet.
              </p>
            `
          : html`
              <ul class="divide-y divide-gray-200 border border-gray-200 rounded-md">
                ${this.members.map(
                  member => html`
                    <li class="flex items-center justify-between py-3 px-4">
                      <div class="flex-1">
                        ${member.person && member.person.displayId
                          ? html`
                              <a
                                href="/persons/${member.person.displayId}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                              >
                                ${member.person.firstName} ${member.person.lastName}
                              </a>
                            `
                          : html`
                              <p class="text-sm font-medium text-gray-900">
                                ${member.person
                                  ? `${member.person.firstName} ${member.person.lastName}`
                                  : `Person ID: ${member.personId}`}
                              </p>
                            `}
                      </div>
                      <button
                        type="button"
                        @click=${() => this.handleRemoveMember(member)}
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
                <h4 class="text-sm font-medium text-gray-900 mb-3">Add New Member</h4>
                <form @submit=${this.handleAddMember} class="space-y-4">
                  <person-search
                    label="Select Person"
                    placeholder="Search for a person to add as member..."
                    .selectedPerson=${this.selectedPerson}
                    .excludePersonIds=${[...this.members.map(m => m.personId), ...this.excludePersonIds]}
                    @person-selected=${this.handlePersonSelected}
                    @person-cleared=${this.handlePersonCleared}
                  ></person-search>

                  <div class="flex gap-2 mt-4">
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
                      Add Member
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
    'group-member-form': GroupMemberForm;
  }
}
