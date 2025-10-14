import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { apiContext } from '../../contexts/api-context.js';
import type { ApiClient } from '../../services/api-client.js';
import type { ContactInformation } from '@irl/shared';
import { ContactType, PrivacyLevel } from '@irl/shared';

interface ContactInfoItem extends Partial<ContactInformation> {
  tempId?: string; // For newly added items not yet saved
  isEditing?: boolean;
  isDirty?: boolean;
}

@customElement('contact-info-form')
export class ContactInfoForm extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @property({ type: String })
  entityType!: 'system' | 'person' | 'group';

  @property({ type: Number })
  entityId!: number;

  @property({ type: Array })
  contactInformations: ContactInformation[] = [];

  @state()
  private items: ContactInfoItem[] = [];

  @state()
  private isSaving = false;

  @state()
  private showAddForm = false;

  @state()
  private newItem: ContactInfoItem = this.getEmptyItem();

  async connectedCallback() {
    super.connectedCallback();
    this.items = [...this.contactInformations];
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('contactInformations')) {
      this.items = [...this.contactInformations];
    }
  }

  private getEmptyItem(): ContactInfoItem {
    return {
      type: ContactType.EMAIL,
      label: '',
      value: '',
      privacy: PrivacyLevel.PUBLIC,
      tempId: `temp-${Date.now()}`
    };
  }

  private handleNewItemChange(field: keyof ContactInfoItem, value: any) {
    this.newItem = { ...this.newItem, [field]: value };
    this.requestUpdate();
  }

  private handleEditItemChange(index: number, field: keyof ContactInfoItem, value: any) {
    const updatedItems = [...this.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value, isDirty: true };
    this.items = updatedItems;
  }

  private async handleAddNew() {
    if (!this.newItem.label?.trim() || !this.newItem.value?.trim()) {
      return;
    }

    this.isSaving = true;

    try {
      // Create the contact information
      const contactData = {
        type: this.newItem.type!,
        label: this.newItem.label.trim(),
        value: this.newItem.value.trim(),
        privacy: this.newItem.privacy!
      };

      const contactResponse = await this.api.createContactInformation(contactData);
      if (!contactResponse.success || !contactResponse.data) {
        throw new Error(contactResponse.error || 'Failed to create contact information');
      }

      const contactId = contactResponse.data.id;

      // Link the contact information to the entity
      if (this.entityType === 'person') {
        await this.api.createPersonContactInformation({
          personId: this.entityId,
          contactInformationId: contactId
        });
      } else if (this.entityType === 'group') {
        await this.api.createGroupContactInformation({
          groupId: this.entityId,
          contactInformationId: contactId
        });
      } else if (this.entityType === 'system') {
        await this.api.createSystemContactInformation({
          systemId: this.entityId,
          contactInformationId: contactId
        });
      }

      // Add to local items
      this.items = [...this.items, contactResponse.data];
      this.newItem = this.getEmptyItem();
      this.showAddForm = false;

      this.dispatchChangeEvent();
    } catch (error) {
      this.dispatchEvent(new CustomEvent('contact-error', {
        detail: { error: error instanceof Error ? error.message : 'Failed to add contact information' },
        bubbles: true,
        composed: true
      }));
    } finally {
      this.isSaving = false;
    }
  }

  private handleEdit(index: number) {
    const updatedItems = [...this.items];
    updatedItems[index] = { ...updatedItems[index], isEditing: true };
    this.items = updatedItems;
  }

  private handleCancelEdit(index: number) {
    const updatedItems = [...this.items];
    const item = updatedItems[index];

    if (item.id) {
      // Restore from original contactInformations
      const original = this.contactInformations.find(c => c.id === item.id);
      if (original) {
        updatedItems[index] = { ...original, isEditing: false, isDirty: false };
      }
    } else {
      // Remove unsaved item
      updatedItems.splice(index, 1);
    }

    this.items = updatedItems;
    this.dispatchChangeEvent();
  }

  private async handleSaveEdit(index: number) {
    const item = this.items[index];
    if (!item.id || !item.label?.trim() || !item.value?.trim()) {
      return;
    }

    this.isSaving = true;

    try {
      const updateData = {
        type: item.type!,
        label: item.label.trim(),
        value: item.value.trim(),
        privacy: item.privacy!
      };

      const response = await this.api.patchContactInformation(item.id, updateData);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update contact information');
      }

      // Update local items
      const updatedItems = [...this.items];
      updatedItems[index] = { ...response.data, isEditing: false, isDirty: false };
      this.items = updatedItems;

      this.dispatchChangeEvent();
    } catch (error) {
      this.dispatchEvent(new CustomEvent('contact-error', {
        detail: { error: error instanceof Error ? error.message : 'Failed to update contact information' },
        bubbles: true,
        composed: true
      }));
    } finally {
      this.isSaving = false;
    }
  }

  private async handleDelete(index: number) {
    const item = this.items[index];

    if (!confirm('Are you sure you want to delete this contact information?')) {
      return;
    }

    if (!item.id) {
      // Not yet saved, just remove from local state
      this.items = this.items.filter((_, i) => i !== index);
      this.dispatchChangeEvent();
      return;
    }

    this.isSaving = true;

    try {
      await this.api.deleteContactInformation(item.id);

      // Remove from local items
      this.items = this.items.filter((_, i) => i !== index);
      this.dispatchChangeEvent();
    } catch (error) {
      this.dispatchEvent(new CustomEvent('contact-error', {
        detail: { error: error instanceof Error ? error.message : 'Failed to delete contact information' },
        bubbles: true,
        composed: true
      }));
    } finally {
      this.isSaving = false;
    }
  }

  private dispatchChangeEvent() {
    this.dispatchEvent(
      new CustomEvent('contact-info-changed', {
        detail: { items: this.items },
        bubbles: true,
        composed: true
      })
    );
  }

  private getContactTypeLabel(type: ContactType): string {
    const labels = {
      [ContactType.EMAIL]: 'Email',
      [ContactType.PHONE]: 'Phone',
      [ContactType.ADDRESS]: 'Address',
      [ContactType.URL]: 'URL'
    };
    return labels[type] || type;
  }

  private getContactTypeIcon(type: ContactType) {
    switch (type) {
      case ContactType.EMAIL:
        return html`<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>`;
      case ContactType.PHONE:
        return html`<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>`;
      case ContactType.ADDRESS:
        return html`<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>`;
      case ContactType.URL:
        return html`<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>`;
    }
  }

  private renderContactItem(item: ContactInfoItem, index: number) {
    const isEditing = item.isEditing || !item.id; // New items are always in edit mode

    if (isEditing) {
      return html`
        <div class="bg-gray-50 rounded-lg p-4 space-y-4 border-2 border-indigo-200">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                .value=${item.type}
                @change=${(e: Event) => this.handleEditItemChange(index, 'type', (e.target as HTMLSelectElement).value)}
              >
                <option value=${ContactType.EMAIL}>Email</option>
                <option value=${ContactType.PHONE}>Phone</option>
                <option value=${ContactType.ADDRESS}>Address</option>
                <option value=${ContactType.URL}>URL</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Privacy</label>
              <select
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                .value=${item.privacy}
                @change=${(e: Event) => this.handleEditItemChange(index, 'privacy', (e.target as HTMLSelectElement).value)}
              >
                <option value=${PrivacyLevel.PUBLIC}>Public</option>
                <option value=${PrivacyLevel.PRIVATE}>Private</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              type="text"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              placeholder="e.g., Work Email, Mobile"
              .value=${item.label || ''}
              @input=${(e: Event) => this.handleEditItemChange(index, 'label', (e.target as HTMLInputElement).value)}
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              type=${item.type === ContactType.EMAIL ? 'email' : item.type === ContactType.URL ? 'url' : 'text'}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              placeholder=${this.getPlaceholder(item.type!)}
              .value=${item.value || ''}
              @input=${(e: Event) => this.handleEditItemChange(index, 'value', (e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="flex gap-2 justify-end">
            <button
              type="button"
              @click=${() => this.handleCancelEdit(index)}
              ?disabled=${this.isSaving}
              class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            ${item.id ? html`
              <button
                type="button"
                @click=${() => this.handleSaveEdit(index)}
                ?disabled=${this.isSaving}
                class="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                ${this.isSaving ? 'Saving...' : 'Save'}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }

    return html`
      <div class="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
        <div class="flex items-start gap-3 flex-1">
          <div class="text-gray-400 mt-0.5">
            ${this.getContactTypeIcon(item.type!)}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900">${item.label}</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.privacy === PrivacyLevel.PUBLIC ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                ${item.privacy === PrivacyLevel.PUBLIC ? 'Public' : 'Private'}
              </span>
            </div>
            <div class="mt-1 text-sm text-gray-600 truncate">${item.value}</div>
            <div class="mt-1 text-xs text-gray-400">${this.getContactTypeLabel(item.type!)}</div>
          </div>
        </div>
        <div class="flex gap-2 ml-4">
          <button
            type="button"
            @click=${() => this.handleEdit(index)}
            ?disabled=${this.isSaving}
            class="text-indigo-600 hover:text-indigo-900 text-sm font-medium disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            @click=${() => this.handleDelete(index)}
            ?disabled=${this.isSaving}
            class="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    `;
  }

  private getPlaceholder(type: ContactType): string {
    const placeholders = {
      [ContactType.EMAIL]: 'email@example.com',
      [ContactType.PHONE]: '+1 (555) 123-4567',
      [ContactType.ADDRESS]: '123 Main St, City, State 12345',
      [ContactType.URL]: 'https://example.com'
    };
    return placeholders[type] || '';
  }

  render() {
    return html`
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">Contact Information</h3>
          ${!this.showAddForm ? html`
            <button
              type="button"
              @click=${() => this.showAddForm = true}
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Contact Info
            </button>
          ` : ''}
        </div>

        ${this.showAddForm ? html`
          <div class="bg-indigo-50 rounded-lg p-4 space-y-4 border-2 border-indigo-300">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  .value=${this.newItem.type}
                  @change=${(e: Event) => this.handleNewItemChange('type', (e.target as HTMLSelectElement).value)}
                >
                  <option value=${ContactType.EMAIL}>Email</option>
                  <option value=${ContactType.PHONE}>Phone</option>
                  <option value=${ContactType.ADDRESS}>Address</option>
                  <option value=${ContactType.URL}>URL</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Privacy</label>
                <select
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  .value=${this.newItem.privacy}
                  @change=${(e: Event) => this.handleNewItemChange('privacy', (e.target as HTMLSelectElement).value)}
                >
                  <option value=${PrivacyLevel.PUBLIC}>Public</option>
                  <option value=${PrivacyLevel.PRIVATE}>Private</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                placeholder="e.g., Work Email, Mobile"
                .value=${this.newItem.label || ''}
                @input=${(e: Event) => this.handleNewItemChange('label', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type=${this.newItem.type === ContactType.EMAIL ? 'email' : this.newItem.type === ContactType.URL ? 'url' : 'text'}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                placeholder=${this.getPlaceholder(this.newItem.type!)}
                .value=${this.newItem.value || ''}
                @input=${(e: Event) => this.handleNewItemChange('value', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="flex gap-2 justify-end">
              <button
                type="button"
                @click=${() => { this.showAddForm = false; this.newItem = this.getEmptyItem(); }}
                ?disabled=${this.isSaving}
                class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                @click=${this.handleAddNew}
                ?disabled=${this.isSaving}
                class="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                ${this.isSaving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        ` : ''}

        ${this.items.length > 0 ? html`
          <div class="space-y-3">
            ${this.items.map((item, index) => this.renderContactItem(item, index))}
          </div>
        ` : html`
          <div class="text-center py-8 text-gray-500 text-sm">
            No contact information added yet.
          </div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'contact-info-form': ContactInfoForm;
  }
}
