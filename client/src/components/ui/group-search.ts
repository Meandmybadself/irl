import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { apiContext } from '../../contexts/api-context.js';
import type { ApiClient } from '../../services/api-client.js';
import type { Group } from '@irl/shared';

@customElement('group-search')
export class GroupSearch extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @property({ type: String }) label = 'Parent Group';
  @property({ type: String }) placeholder = 'Search for a group...';
  @property({ type: Object }) selectedGroup: Group | null = null;
  @property({ type: Number }) excludeGroupId: number | null = null;

  @state()
  private searchQuery = '';

  @state()
  private searchResults: Group[] = [];

  @state()
  private isSearching = false;

  @state()
  private showDropdown = false;

  @state()
  private debounceTimer: number | null = null;

  private async performSearch(query: string) {
    if (!query.trim()) {
      this.searchResults = [];
      this.showDropdown = false;
      return;
    }

    this.isSearching = true;
    try {
      const response = await this.api.getGroups(1, 10, query);
      if (response.success && response.data) {
        // Filter out the current group if we're editing
        this.searchResults = this.excludeGroupId
          ? response.data.filter(g => g.id !== this.excludeGroupId)
          : response.data;
        this.showDropdown = this.searchResults.length > 0;
      }
    } catch (error) {
      console.error('Failed to search groups:', error);
      this.searchResults = [];
      this.showDropdown = false;
    } finally {
      this.isSearching = false;
    }
  }

  private handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.searchQuery = target.value;

    // Clear previous debounce timer
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    // Debounce search by 300ms
    this.debounceTimer = window.setTimeout(() => {
      this.performSearch(this.searchQuery);
    }, 300);
  }

  private handleSelectGroup(group: Group) {
    this.selectedGroup = group;
    this.searchQuery = group.name;
    this.showDropdown = false;
    this.searchResults = [];

    this.dispatchEvent(
      new CustomEvent('group-selected', {
        detail: { group },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleClear() {
    this.selectedGroup = null;
    this.searchQuery = '';
    this.searchResults = [];
    this.showDropdown = false;

    this.dispatchEvent(
      new CustomEvent('group-cleared', {
        bubbles: true,
        composed: true
      })
    );
  }

  private handleFocus() {
    if (this.searchQuery && this.searchResults.length > 0) {
      this.showDropdown = true;
    }
  }

  private handleBlur() {
    // Delay hiding dropdown to allow click events to fire
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  render() {
    return html`
      <div class="relative">
        <label class="block text-sm/6 font-medium text-gray-900 mb-2">
          ${this.label} (optional)
        </label>
        <div class="relative">
          <input
            type="text"
            .value=${this.searchQuery}
            placeholder=${this.placeholder}
            class="block w-full rounded-md bg-white px-3 py-1.5 pr-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
            @input=${this.handleInput}
            @focus=${this.handleFocus}
            @blur=${this.handleBlur}
          />
          ${this.selectedGroup
            ? html`
                <button
                  type="button"
                  @click=${this.handleClear}
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              `
            : this.isSearching
            ? html`
                <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div class="inline-block w-4 h-4 border-2 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
                </div>
              `
            : ''}
        </div>

        ${this.showDropdown
          ? html`
              <div class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black/5 overflow-auto focus:outline-none sm:text-sm">
                ${this.searchResults.map(
                  group => html`
                    <button
                      type="button"
                      @click=${() => this.handleSelectGroup(group)}
                      class="w-full text-left px-3 py-2 hover:bg-indigo-50 cursor-pointer"
                    >
                      <div class="font-medium text-gray-900">${group.name}</div>
                      <div class="text-sm text-gray-500">${group.displayId}</div>
                      ${group.description
                        ? html`<div class="text-xs text-gray-400 mt-1 truncate">${group.description}</div>`
                        : ''}
                    </button>
                  `
                )}
              </div>
            `
          : ''}

        ${this.selectedGroup
          ? html`
              <p class="mt-1 text-sm text-gray-600">
                Selected: <span class="font-medium">${this.selectedGroup.name}</span>
              </p>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-search': GroupSearch;
  }
}
