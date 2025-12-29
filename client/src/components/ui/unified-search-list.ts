import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Person, Group, ContactInformation } from '@irl/shared';
import { ContactType, PrivacyLevel } from '@irl/shared';
import { textStyles, backgroundColors, textColors } from '../../utilities/text-colors.js';
import { BaseList, SortableColumn } from './base-list.js';
import { renderIcon } from '../../utilities/icons.js';

// Union type for items that can be either Person or Group
type SearchItem =
  | { type: 'person'; data: Person }
  | { type: 'group'; data: Group };

@customElement('unified-search-list')
export class UnifiedSearchList extends BaseList<SearchItem> {
  @property({ type: Array })
  persons: Person[] = [];

  @property({ type: Array })
  groups: Group[] = [];

  @property({ attribute: false })
  personContacts: Map<number, ContactInformation[]> = new Map();

  @property({ attribute: false })
  groupContacts: Map<number, ContactInformation[]> = new Map();

  @property({ type: Boolean })
  showPrivateContacts = false;

  // Combine persons and groups into unified items array
  get items(): SearchItem[] {
    const personItems: SearchItem[] = this.persons.map(person => ({
      type: 'person',
      data: person
    }));

    const groupItems: SearchItem[] = this.groups.map(group => ({
      type: 'group',
      data: group
    }));

    return [...personItems, ...groupItems];
  }

  protected getColumnCount(): number {
    return 2; // Type/Name + Contact Information
  }

  protected getColumns(): SortableColumn<SearchItem>[] {
    return [
      {
        id: 'name',
        label: 'Name',
        sortable: true,
        getSortValue: (item) => {
          if (item.type === 'person') {
            return `${item.data.firstName} ${item.data.lastName}`.toLowerCase();
          } else {
            return item.data.name.toLowerCase();
          }
        },
      },
      {
        id: 'contact',
        label: 'Contact Information',
        sortable: false,
      },
    ];
  }

  protected getSearchableText(item: SearchItem): string {
    const contactTexts: string[] = [];

    if (item.type === 'person') {
      const contacts = this.getVisiblePersonContacts(item.data.id);
      contacts.forEach(contact => {
        if (contact.value) {
          contactTexts.push(contact.value);
          if (contact.label) {
            contactTexts.push(contact.label);
          }
        }
      });

      return [
        item.data.firstName,
        item.data.lastName,
        item.data.displayId,
        'person',
        ...contactTexts,
      ].filter(Boolean).join(' ');
    } else {
      const contacts = this.getVisibleGroupContacts(item.data.id);
      contacts.forEach(contact => {
        if (contact.value) {
          contactTexts.push(contact.value);
          if (contact.label) {
            contactTexts.push(contact.label);
          }
        }
      });

      return [
        item.data.name,
        item.data.displayId,
        item.data.description || '',
        'group',
        ...contactTexts,
      ].filter(Boolean).join(' ');
    }
  }

  protected getEmptyStateMessage(): string {
    return 'No people or groups found.';
  }

  private getVisiblePersonContacts(personId: number): ContactInformation[] {
    const contacts = this.personContacts.get(personId) ?? [];
    return this.showPrivateContacts
      ? contacts
      : contacts.filter(contact => contact.privacy === PrivacyLevel.PUBLIC);
  }

  private getVisibleGroupContacts(groupId: number): ContactInformation[] {
    const contacts = this.groupContacts.get(groupId) ?? [];
    return this.showPrivateContacts
      ? contacts
      : contacts.filter(contact => contact.privacy === PrivacyLevel.PUBLIC);
  }

  private getContactTypeLabel(type: ContactType): string {
    switch (type) {
      case ContactType.EMAIL:
        return 'Email';
      case ContactType.PHONE:
        return 'Phone';
      case ContactType.ADDRESS:
        return 'Address';
      case ContactType.URL:
        return 'Website';
      default:
        return 'Contact';
    }
  }

  private getContactTypeIcon(type: ContactType): string {
    switch (type) {
      case ContactType.EMAIL:
        return 'Mail';
      case ContactType.PHONE:
        return 'Phone';
      case ContactType.ADDRESS:
        return 'MapPin';
      case ContactType.URL:
        return 'Globe';
      default:
        return 'Mail';
    }
  }

  private renderContactValue(item: ContactInformation) {
    const value = item.value ?? '';

    switch (item.type) {
      case ContactType.EMAIL:
        return html`<a
          href="mailto:${value}"
          class="${textColors.link} ${textColors.linkHover}"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${value}
        </a>`;
      case ContactType.PHONE:
        return html`<a
          href="tel:${value}"
          class="${textColors.link} ${textColors.linkHover}"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${value}
        </a>`;
      case ContactType.URL:
        return html`<a
          href="${value}"
          target="_blank"
          rel="noopener noreferrer"
          class="${textColors.link} ${textColors.linkHover}"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${value}
        </a>`;
      case ContactType.ADDRESS:
        return html`<a
          href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}"
          target="_blank"
          rel="noopener noreferrer"
          class="${textColors.link} ${textColors.linkHover}"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${value}
        </a>`;
      default:
        return html`${value}`;
    }
  }

  private renderContactColumn(item: SearchItem) {
    const contacts = item.type === 'person'
      ? this.getVisiblePersonContacts(item.data.id).filter(c => !!c.value)
      : this.getVisibleGroupContacts(item.data.id).filter(c => !!c.value);

    if (contacts.length === 0) {
      return html`<span class="${textStyles.body.xs} opacity-60">No contact info</span>`;
    }

    return html`
      <div class="space-y-1">
        ${contacts.slice(0, 3).map(
          contact => html`
            <div class="flex items-center gap-1.5">
              <span
                class="inline-flex ${textStyles.table.cellPrimary}"
                title="${contact.label || this.getContactTypeLabel(contact.type)}"
              >
                ${renderIcon(this.getContactTypeIcon(contact.type), 'w-3.5 h-3.5')}
              </span>
              <span class="truncate ${textStyles.table.cellSecondary} text-xs">
                ${this.renderContactValue(contact)}
              </span>
            </div>
          `
        )}
        ${contacts.length > 3
          ? html`<span class="${textStyles.body.xs} opacity-60">+${contacts.length - 3} more</span>`
          : ''}
      </div>
    `;
  }

  private getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  private handleItemClick(item: SearchItem) {
    if (item.type === 'person') {
      window.history.pushState({}, '', `/persons/${item.data.displayId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      window.history.pushState({}, '', `/groups/${item.data.displayId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  protected renderRow(item: SearchItem): TemplateResult {
    if (item.type === 'person') {
      return this.renderPersonRow(item.data);
    } else {
      return this.renderGroupRow(item.data);
    }
  }

  private renderPersonRow(person: Person): TemplateResult {
    const rowClasses = `cursor-pointer ${backgroundColors.contentHover} transition-colors`;
    const item: SearchItem = { type: 'person', data: person };

    return html`
      <tr class="${rowClasses}" @click=${() => this.handleItemClick(item)}>
        <td class="py-3 pr-8 pl-8 text-sm ${textStyles.table.cellPrimary}">
          <div class="flex items-center">
            <div class="size-8 shrink-0">
              ${person.imageURL
                ? html`
                    <img
                      src="${person.imageURL}"
                      alt="${person.firstName} ${person.lastName}"
                      class="size-8 rounded-full dark:outline dark:outline-white/10"
                    />
                  `
                : html`
                    <div
                      class="size-8 rounded-full bg-indigo-600 flex items-center justify-center ${textStyles.button.primary} font-medium text-xs"
                    >
                      ${this.getInitials(person.firstName, person.lastName)}
                    </div>
                  `}
            </div>
            <div class="ml-4">
              <div class="font-medium ${textStyles.table.cellPrimary} flex items-center gap-2">
                <span>${person.firstName} ${person.lastName}</span>
                <span class="inline-flex items-center rounded-md bg-blue-100 p-1 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                  ${renderIcon('User', 'w-3 h-3')}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td class="px-8 py-3 text-sm ${textStyles.table.cellSecondary}">
          ${this.renderContactColumn(item)}
        </td>
      </tr>
    `;
  }

  private renderGroupRow(group: Group): TemplateResult {
    const rowClasses = `cursor-pointer ${backgroundColors.contentHover} transition-colors`;
    const item: SearchItem = { type: 'group', data: group };

    return html`
      <tr class="${rowClasses}" @click=${() => this.handleItemClick(item)}>
        <td class="py-3 pr-8 pl-8 text-sm ${textStyles.table.cellPrimary}">
          <div class="flex items-center">
            <div class="size-8 shrink-0">
              <div class="size-8 rounded-full bg-green-600 flex items-center justify-center ${textStyles.button.primary} font-medium text-xs">
                📂
              </div>
            </div>
            <div class="ml-4">
              <div class="font-medium ${textStyles.table.cellPrimary} flex items-center gap-2">
                <span>${group.name}</span>
                <span class="inline-flex items-center rounded-md bg-green-100 p-1 text-green-800 dark:bg-green-500/20 dark:text-green-300">
                  ${renderIcon('Users', 'w-3 h-3')}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td class="px-8 py-3 text-sm ${textStyles.table.cellSecondary}">
          ${this.renderContactColumn(item)}
        </td>
      </tr>
    `;
  }

  protected renderHeader(): TemplateResult {
    if (!this.showHeader) {
      return html``;
    }

    return html`
      <thead>
        <tr>
          ${this.renderSortableHeader('name', 'Name', true)}
          ${this.renderSortableHeader('contact', 'Contact Information', false)}
        </tr>
      </thead>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'unified-search-list': UnifiedSearchList;
  }
}
