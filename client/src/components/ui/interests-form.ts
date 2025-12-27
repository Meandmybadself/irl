import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { apiContext } from '../../contexts/api-context.js';
import type { ApiClient } from '../../services/api-client.js';
import type { Interest, PersonInterest } from '@irl/shared';
import { textColors, backgroundColors } from '../../utilities/text-colors.js';

interface PersonInterestWithInterest extends PersonInterest {
  interest?: Interest;
}

interface InterestItem {
  interestId: number;
  level: number;
  interest?: Interest;
}

@customElement('interests-form')
export class InterestsForm extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @property({ type: String })
  personDisplayId!: string;

  @state()
  private allInterests: Interest[] = [];

  @state()
  private personInterests: PersonInterestWithInterest[] = [];

  @state()
  private interestItems: InterestItem[] = [];

  @state()
  private isLoading = false;

  @state()
  private isSaving = false;

  @state()
  private selectedCategory: string = '';

  @state()
  private categories: string[] = [];

  async connectedCallback() {
    super.connectedCallback();
    await this.loadData();
  }

  private async loadData() {
    this.isLoading = true;
    try {
      // Load all interests
      const interestsResponse = await this.api.getInterests(undefined, { limit: 1000 });
      if (interestsResponse.success && interestsResponse.data) {
        this.allInterests = interestsResponse.data;
        // Extract unique categories
        this.categories = [...new Set(this.allInterests.map(i => i.category))].sort();
      }

      // Load person's interests
      const personInterestsResponse = await this.api.getPersonInterests(this.personDisplayId);
      if (personInterestsResponse.success && personInterestsResponse.data) {
        this.personInterests = personInterestsResponse.data;
        // Convert to interest items
        this.interestItems = this.personInterests.map(pi => ({
          interestId: pi.interestId,
          level: pi.level,
          interest: pi.interest
        }));
      }
    } catch (error) {
      this.dispatchEvent(new CustomEvent('interest-error', {
        detail: { error: error instanceof Error ? error.message : 'Failed to load interests' },
        bubbles: true,
        composed: true
      }));
    } finally {
      this.isLoading = false;
    }
  }

  private getFilteredInterests(): Interest[] {
    if (!this.selectedCategory) {
      return this.allInterests;
    }
    return this.allInterests.filter(i => i.category === this.selectedCategory);
  }

  private getInterestLevel(interestId: number): number {
    const item = this.interestItems.find(i => i.interestId === interestId);
    return item?.level ?? 0;
  }

  private updateInterestLevel(interestId: number, level: number) {
    const existingIndex = this.interestItems.findIndex(i => i.interestId === interestId);
    const interest = this.allInterests.find(i => i.id === interestId);

    if (level === 0) {
      // Remove if level is 0
      if (existingIndex >= 0) {
        this.interestItems = this.interestItems.filter(i => i.interestId !== interestId);
      }
    } else {
      // Add or update
      const item: InterestItem = {
        interestId,
        level,
        interest
      };
      if (existingIndex >= 0) {
        this.interestItems = [
          ...this.interestItems.slice(0, existingIndex),
          item,
          ...this.interestItems.slice(existingIndex + 1)
        ];
      } else {
        this.interestItems = [...this.interestItems, item];
      }
    }

    this.requestUpdate();
    this.dispatchChange();
  }

  private dispatchChange() {
    this.dispatchEvent(new CustomEvent('interests-changed', {
      detail: { items: this.interestItems },
      bubbles: true,
      composed: true
    }));
  }

  private async handleSave() {
    this.isSaving = true;
    try {
      const response = await this.api.setPersonInterests(this.personDisplayId, {
        interests: this.interestItems.map(item => ({
          interestId: item.interestId,
          level: item.level
        }))
      });

      if (response.success && response.data) {
        this.personInterests = response.data;
        this.dispatchEvent(new CustomEvent('interests-saved', {
          bubbles: true,
          composed: true
        }));
      }
    } catch (error) {
      this.dispatchEvent(new CustomEvent('interest-error', {
        detail: { error: error instanceof Error ? error.message : 'Failed to save interests' },
        bubbles: true,
        composed: true
      }));
    } finally {
      this.isSaving = false;
    }
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="flex items-center justify-center py-4">
          <div class="inline-block w-6 h-6 border-2 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
        </div>
      `;
    }

    const filteredInterests = this.getFilteredInterests();

    return html`
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold ${textColors.primary}">Interests</h3>
          <button
            type="button"
            @click=${this.handleSave}
            ?disabled=${this.isSaving}
            class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ${this.isSaving
              ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
              : ''}
            Save Interests
          </button>
        </div>

        <div>
          <label for="category-filter" class="block text-sm font-medium ${textColors.primary} mb-2">
            Filter by Category
          </label>
          <select
            id="category-filter"
            .value=${this.selectedCategory}
            @change=${(e: Event) => {
              this.selectedCategory = (e.target as HTMLSelectElement).value;
            }}
            class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
          >
            <option value="">All Categories</option>
            ${this.categories.map(cat => html`
              <option value="${cat}">${cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            `)}
          </select>
        </div>

        <div class="space-y-3 max-h-96 overflow-y-auto ${backgroundColors.content} p-4 rounded-lg border ${backgroundColors.border}">
          ${filteredInterests.length === 0
            ? html`<p class="text-sm ${textColors.tertiary}">No interests found</p>`
            : filteredInterests.map(interest => {
                const level = this.getInterestLevel(interest.id);
                return html`
                  <div class="flex items-center justify-between py-2 border-b ${backgroundColors.border} last:border-b-0">
                    <div class="flex-1">
                      <div class="text-sm font-medium ${textColors.primary}">${interest.name}</div>
                      <div class="text-xs ${textColors.tertiary}">${interest.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    </div>
                    <div class="flex items-center gap-3 ml-4">
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        .value=${(level * 4).toString()}
                        @input=${(e: Event) => {
                          const displayValue = parseInt((e.target as HTMLInputElement).value);
                          const apiValue = displayValue / 4;
                          this.updateInterestLevel(interest.id, apiValue);
                        }}
                        class="w-32"
                      />
                      <span class="text-sm font-medium ${textColors.primary} w-12 text-right">
                        ${(level * 4).toFixed(0)}
                      </span>
                    </div>
                  </div>
                `;
              })
          }
        </div>

        <p class="text-xs ${textColors.tertiary}">
          Adjust the sliders to indicate your interest level (0-4) for each activity. Interests with 0 are not saved.
        </p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'interests-form': InterestsForm;
  }
}


