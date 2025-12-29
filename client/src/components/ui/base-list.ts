import { LitElement, html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fuzzyMatch } from '../../utilities/fuzzy-search.js';
import { SEARCH_DEBOUNCE_MS } from '../../constants.js';
import { textStyles, backgroundColors } from '../../utilities/text-colors.js';

/**
 * Configuration for a sortable column in a list
 */
export interface SortableColumn<T> {
  /** Unique identifier for the column */
  id: string;
  /** Display label for the column header */
  label: string;
  /** Whether this column is sortable */
  sortable: boolean;
  /** Custom sort function. If not provided, uses default string/number comparison */
  sortFn?: (a: T, b: T) => number;
  /** Function to extract the value to sort by from an item */
  getSortValue?: (item: T) => string | number;
}

/**
 * Abstract base class for list components with search and sorting capabilities
 */
export abstract class BaseList<T> extends LitElement {
  createRenderRoot() {
    return this;
  }

  /** The data items to display */
  @property({ type: Array, attribute: false })
  abstract items: T[];

  /** Whether to show the header row */
  @property({ type: Boolean })
  showHeader = true;

  /** Whether data is currently loading */
  @property({ type: Boolean })
  isLoading = false;

  /** Current search query */
  @state()
  private searchQuery = '';

  /** Currently sorted column ID */
  @state()
  private sortColumn: string | null = null;

  /** Current sort direction */
  @state()
  private sortDirection: 'asc' | 'desc' = 'asc';

  /** Debounce timer for search */
  private searchDebounceTimer: number | null = null;

  /**
   * Get the column configuration for this list
   */
  protected abstract getColumns(): SortableColumn<T>[];

  /**
   * Extract searchable text from an item
   * This text will be used for fuzzy matching
   */
  protected abstract getSearchableText(item: T): string;

  /**
   * Render a table row for an item
   */
  protected abstract renderRow(item: T): TemplateResult;

  /**
   * Get the number of columns (for colspan calculations)
   */
  protected abstract getColumnCount(): number;

  /**
   * Get the empty state message when there's no data
   */
  protected abstract getEmptyStateMessage(): string;

  /**
   * Get the "no results" message when search returns empty
   */
  protected getNoResultsMessage(): string {
    return 'No results match your query.';
  }

  /**
   * Handle search input changes with debouncing
   */
  private handleSearchInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.searchQuery = target.value;

    // Clear existing timer
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Set new timer for debounced search
    this.searchDebounceTimer = window.setTimeout(() => {
      this.requestUpdate();
    }, SEARCH_DEBOUNCE_MS);
  };

  /**
   * Clear the search query
   */
  private handleClearSearch = () => {
    this.searchQuery = '';
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.requestUpdate();
  };

  /**
   * Handle column header click for sorting
   */
  private handleSort = (columnId: string) => {
    if (this.sortColumn === columnId) {
      // Toggle direction if clicking the same column
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new column and default to ascending
      this.sortColumn = columnId;
      this.sortDirection = 'asc';
    }
    this.requestUpdate();
  };

  /**
   * Get filtered and sorted data
   */
  private getFilteredAndSortedData(): T[] {
    let filtered = this.items;

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim();
      filtered = this.items.filter(item => {
        const searchableText = this.getSearchableText(item);
        return fuzzyMatch(query, searchableText);
      });
    }

    // Apply sorting
    if (this.sortColumn) {
      const column = this.getColumns().find(col => col.id === this.sortColumn);
      if (column && column.sortable) {
        const sorted = [...filtered];
        sorted.sort((a, b) => {
          if (column.sortFn) {
            return column.sortFn(a, b);
          }

          // Default sorting using getSortValue or direct comparison
          const aValue = column.getSortValue ? column.getSortValue(a) : a;
          const bValue = column.getSortValue ? column.getSortValue(b) : b;

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue);
          }
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return aValue - bValue;
          }
          return String(aValue).localeCompare(String(bValue));
        });

        if (this.sortDirection === 'desc') {
          sorted.reverse();
        }
        filtered = sorted;
      }
    }

    return filtered;
  }

  /**
   * Render the search input field
   */
  protected renderSearchInput(): TemplateResult {
    return html`
      <div class="mb-4">
        <div class="relative">
          <input
            type="text"
            .value=${this.searchQuery}
            @input=${this.handleSearchInput}
            placeholder="Search..."
            class="w-full px-3 py-2 pl-10 pr-10 border ${backgroundColors.border} rounded-md ${textStyles.input} ${textStyles.placeholder} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          />
          ${this.searchQuery
            ? html`
                <button
                  @click=${this.handleClearSearch}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              `
            : html`
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              `}
        </div>
      </div>
    `;
  }

  /**
   * Render a sortable column header
   */
  protected renderSortableHeader(columnId: string, label: string, sortable: boolean): TemplateResult {
    const column = this.getColumns().find(col => col.id === columnId);
    if (!column || !sortable) {
      return html`
        <th scope="col" class="py-3.5 pr-8 pl-8 text-left ${textStyles.table.header}">
          ${label}
        </th>
      `;
    }

    const isSorted = this.sortColumn === columnId;
    const sortIcon = isSorted
      ? this.sortDirection === 'asc'
        ? html`<svg class="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>`
        : html`<svg class="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>`
      : html`<svg class="w-4 h-4 inline-block ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>`;

    return html`
      <th
        scope="col"
        class="py-3.5 pr-8 pl-8 text-left ${textStyles.table.header} cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        @click=${() => this.handleSort(columnId)}
      >
        <div class="flex items-center">
          ${label}
          ${sortIcon}
        </div>
      </th>
    `;
  }

  /**
   * Render the table header
   * Child classes should override this to use renderSortableHeader for their columns
   */
  protected renderHeader(): TemplateResult {
    if (!this.showHeader) {
      return html``;
    }
    return html``;
  }

  /**
   * Render the table body
   */
  protected renderBody(): TemplateResult {
    const filteredData = this.getFilteredAndSortedData();
    const hasSearchQuery = this.searchQuery.trim().length > 0;
    const hasNoData = this.items.length === 0;
    const hasNoResults = hasSearchQuery && filteredData.length === 0;

    if (hasNoData) {
      return html`
        <tr>
          <td colspan="${this.getColumnCount()}" class="px-3 py-8 text-center ${textStyles.table.cellSecondary}">
            ${this.isLoading ? 'Loading...' : this.getEmptyStateMessage()}
          </td>
        </tr>
      `;
    }

    if (hasNoResults) {
      return html`
        <tr>
          <td colspan="${this.getColumnCount()}" class="px-3 py-8 text-center ${textStyles.table.cellSecondary}">
            ${this.getNoResultsMessage()}
          </td>
        </tr>
      `;
    }

    return html`${filteredData.map(item => this.renderRow(item))}`;
  }

  /**
   * Render the component
   */
  render(): TemplateResult {
    return html`
      <div>
        ${this.renderSearchInput()}
        <table class="relative min-w-full divide-y ${backgroundColors.divideStrong}">
          ${this.renderHeader()}
          <tbody class="divide-y ${backgroundColors.divide}">
            ${this.renderBody()}
          </tbody>
        </table>
      </div>
    `;
  }
}






