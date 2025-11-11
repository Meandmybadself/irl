import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { apiContext } from '../../contexts/api-context.js';
import { storeContext } from '../../contexts/store-context.js';
import { addNotification } from '../../store/slices/ui.js';
import { selectCurrentUser } from '../../store/selectors.js';
import { parsePersonsFromTSV, parseGroupsFromTSV } from '../../utilities/tsv-parser.js';
import { textColors, backgroundColors } from '../../utilities/text-colors.js';
import type { ApiClient } from '../../services/api-client.js';
import type { AppStore } from '../../store/index.js';
import type { ParsedPerson, ParsedGroup } from '../../utilities/tsv-parser.js';

type EntityType = 'person' | 'group';

@customElement('bulk-import-modal')
export class BulkImportModal extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @property({ type: String })
  entityType: EntityType = 'person';

  @property({ type: Boolean })
  open = false;

  @state()
  private tsvInput = '';

  @state()
  private parsedData: ParsedPerson[] | ParsedGroup[] = [];

  @state()
  private parseErrors: Array<{ row: number; error: string }> = [];

  @state()
  private isParsed = false;

  @state()
  private isSubmitting = false;

  @state()
  private showResults = false;

  @state()
  private importedCount = 0;

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
    this.reset();
  }

  private reset() {
    this.tsvInput = '';
    this.parsedData = [];
    this.parseErrors = [];
    this.isParsed = false;
    this.isSubmitting = false;
    this.showResults = false;
    this.importedCount = 0;
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.tsvInput = target.value;
    this.isParsed = false;
    this.parsedData = [];
    this.parseErrors = [];
  }

  private handleParse() {
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser) {
      this.store.dispatch(addNotification('You must be logged in', 'error'));
      return;
    }

    if (this.entityType === 'person') {
      const result = parsePersonsFromTSV(this.tsvInput, currentUser.id);
      this.parsedData = result.data;
      this.parseErrors = result.errors;
    } else {
      const result = parseGroupsFromTSV(this.tsvInput);
      this.parsedData = result.data;
      this.parseErrors = result.errors;
    }

    this.isParsed = true;
  }

  private async handleSubmit() {
    if (this.parsedData.length === 0) {
      this.store.dispatch(addNotification('No data to import', 'error'));
      return;
    }

    this.isSubmitting = true;
    try {
      let response;
      if (this.entityType === 'person') {
        response = await this.api.bulkCreatePersons(this.parsedData as ParsedPerson[]);
      } else {
        response = await this.api.bulkCreateGroups(this.parsedData as ParsedGroup[]);
      }

      if (response.success && response.data) {
        this.importedCount = response.data.length;
        this.showResults = true;

        this.store.dispatch(
          addNotification(`Successfully imported ${this.importedCount} ${this.entityType}(s)`, 'success')
        );

        // Notify parent to refresh list
        this.dispatchEvent(new CustomEvent('import-complete'));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          `Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error'
        )
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  render() {
    if (!this.open) {
      return null;
    }

    return html`
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="fixed inset-0 bg-black bg-opacity-25" @click=${this.handleClose}></div>

          <div class="${backgroundColors.content} rounded-lg shadow-xl relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div class="px-6 py-4 border-b ${backgroundColors.border}">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold ${textColors.primary}">
                  Bulk Import ${this.entityType === 'person' ? 'Persons' : 'Groups'}
                </h3>
                <button
                  @click=${this.handleClose}
                  class="${textColors.tertiary} hover:${textColors.primary}"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="px-6 py-4">
              ${this.showResults ? this.renderResults() : this.renderImportForm()}
            </div>

            <div class="px-6 py-4 border-t ${backgroundColors.border} flex justify-end gap-x-3">
              ${this.showResults
                ? html`
                    <button
                      @click=${this.handleClose}
                      class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
                    >
                      Close
                    </button>
                  `
                : html`
                    <button
                      @click=${this.handleClose}
                      class="rounded-md px-3 py-2 text-sm font-semibold ${textColors.primary}"
                    >
                      Cancel
                    </button>
                    ${!this.isParsed
                      ? html`
                          <button
                            @click=${this.handleParse}
                            ?disabled=${!this.tsvInput.trim()}
                            class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Parse Data
                          </button>
                        `
                      : html`
                          <button
                            @click=${this.handleSubmit}
                            ?disabled=${this.isSubmitting || this.parsedData.length === 0}
                            class="flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ${this.isSubmitting
                              ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                              : ''}
                            Import ${this.parsedData.length} ${this.entityType}(s)
                          </button>
                        `}
                  `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderImportForm() {
    return html`
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium ${textColors.primary} mb-2">
            Paste TSV Data
          </label>
          <p class="text-sm ${textColors.tertiary} mb-2">
            ${this.entityType === 'person'
              ? 'Format: firstName, lastName, displayId, pronouns, imageURL, contactType1, contactLabel1, contactValue1, contactPrivacy1, ...'
              : 'Format: name, displayId, description, publiclyVisible, allowsAnyUserToCreateSubgroup, parentGroupDisplayId, contactType1, contactLabel1, contactValue1, contactPrivacy1, ...'}
          </p>
          <textarea
            .value=${this.tsvInput}
            @input=${this.handleInputChange}
            rows="8"
            placeholder="Paste your TSV data here..."
            class="block w-full rounded-md ${backgroundColors.content} px-3 py-2 text-sm ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
          ></textarea>
        </div>

        ${this.parseErrors.length > 0
          ? html`
              <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <h4 class="text-sm font-medium ${textColors.error} mb-2">Parse Errors</h4>
                <ul class="list-disc list-inside text-sm ${textColors.error}">
                  ${this.parseErrors.map(
                    err => html`<li>Row ${err.row}: ${err.error}</li>`
                  )}
                </ul>
              </div>
            `
          : ''}

        ${this.isParsed && this.parsedData.length > 0
          ? html`
              <div>
                <h4 class="text-sm font-medium ${textColors.primary} mb-2">
                  Preview (${this.parsedData.length} ${this.entityType}(s))
                </h4>
                <div class="overflow-x-auto">
                  ${this.entityType === 'person'
                    ? this.renderPersonsPreview()
                    : this.renderGroupsPreview()}
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private renderPersonsPreview() {
    const persons = this.parsedData as ParsedPerson[];
    return html`
      <table class="min-w-full divide-y ${backgroundColors.border}">
        <thead>
          <tr>
            <th class="px-3 py-2 text-left text-xs font-medium ${textColors.tertiary} uppercase">First Name</th>
            <th class="px-3 py-2 text-left text-xs font-medium ${textColors.tertiary} uppercase">Last Name</th>
            <th class="px-3 py-2 text-left text-xs font-medium ${textColors.tertiary} uppercase">Display ID</th>
            <th class="px-3 py-2 text-left text-xs font-medium ${textColors.tertiary} uppercase">Pronouns</th>
            <th class="px-3 py-2 text-left text-xs font-medium ${textColors.tertiary} uppercase">Contacts</th>
          </tr>
        </thead>
        <tbody class="divide-y ${backgroundColors.border}">
          ${persons.map(
            person => html`
              <tr>
                <td class="px-3 py-2 text-sm ${textColors.primary}">${person.firstName}</td>
                <td class="px-3 py-2 text-sm ${textColors.primary}">${person.lastName}</td>
                <td class="px-3 py-2 text-sm ${textColors.primary}">${person.displayId}</td>
                <td class="px-3 py-2 text-sm ${textColors.secondary}">${person.pronouns || '-'}</td>
                <td class="px-3 py-2 text-sm ${textColors.secondary}">
                  ${person.contactInformations?.length || 0}
                </td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  private renderGroupsPreview() {
    const groups = this.parsedData as ParsedGroup[];
    return html`
      <table class="min-w-full divide-y ${backgroundColors.border}">
        <thead>
          <tr>
            <th class="px-3 py-2 text-left text-xs font-medium ${textColors.tertiary} uppercase">Name</th>
            <th class="px-3 py-2 text-left text-xs font-medium ${textColors.tertiary} uppercase">Display ID</th>
            <th class="px-3 py-2 text-left text-xs font-medium ${textColors.tertiary} uppercase">Visible</th>
            <th class="px-3 py-2 text-left text-xs font-medium ${textColors.tertiary} uppercase">Contacts</th>
          </tr>
        </thead>
        <tbody class="divide-y ${backgroundColors.border}">
          ${groups.map(
            group => html`
              <tr>
                <td class="px-3 py-2 text-sm ${textColors.primary}">${group.name}</td>
                <td class="px-3 py-2 text-sm ${textColors.primary}">${group.displayId}</td>
                <td class="px-3 py-2 text-sm ${textColors.secondary}">
                  ${group.publiclyVisible ? 'Yes' : 'No'}
                </td>
                <td class="px-3 py-2 text-sm ${textColors.secondary}">
                  ${group.contactInformations?.length || 0}
                </td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  private renderResults() {
    return html`
      <div class="space-y-4">
        <div class="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
          <h4 class="text-sm font-medium ${textColors.primary} mb-2">Import Successful</h4>
          <p class="text-sm ${textColors.secondary}">
            Successfully imported ${this.importedCount} ${this.entityType}(s).
          </p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bulk-import-modal': BulkImportModal;
  }
}
