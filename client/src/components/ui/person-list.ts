import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ContactInformation, Person } from '@irl/shared';
import { ContactType, PrivacyLevel } from '@irl/shared';
import { textStyles, backgroundColors, textColors } from '../../utilities/text-colors.js';
import { BaseList, SortableColumn } from './base-list.js';

@customElement('person-list')
export class PersonList extends BaseList<Person> {
  @property({ type: Array })
  persons: Person[] = [];

  // Map persons to items for base class
  get items(): Person[] {
    return this.persons;
  }

  @property({ type: Boolean })
  showAdmin = false;

  @property({ type: Array })
  adminPersonIds: number[] = [];

  @property({ type: Boolean })
  linkToDetail = false;

  @property({ type: Boolean })
  showEdit = true;

  @property({ attribute: false })
  personContacts: Map<number, ContactInformation[]> = new Map();

  @property({ type: Boolean })
  showPrivateContacts = false;

  @property({ type: Boolean })
  showContacts = true;

  protected getColumnCount(): number {
    let count = 1; // Name
    if (this.showContacts) {
      count += 1; // Contact Information
    }
    if (this.showEdit) {
      count += 1;
    }
    return count;
  }

  protected getColumns(): SortableColumn<Person>[] {
    return [
      {
        id: 'name',
        label: 'Name',
        sortable: true,
        getSortValue: (person) => `${person.firstName} ${person.lastName}`.toLowerCase(),
      },
      {
        id: 'contact',
        label: 'Contact Information',
        sortable: false,
      },
      {
        id: 'edit',
        label: 'Edit',
        sortable: false,
      },
    ];
  }

  protected getSearchableText(person: Person): string {
    const contactTexts: string[] = [];
    const contacts = this.getVisibleContacts(person.id);
    contacts.forEach(contact => {
      if (contact.value) {
        contactTexts.push(contact.value);
        if (contact.label) {
          contactTexts.push(contact.label);
        }
      }
    });

    return [
      person.firstName,
      person.lastName,
      person.displayId,
      ...contactTexts,
    ].filter(Boolean).join(' ');
  }

  protected getEmptyStateMessage(): string {
    return 'No people found.';
  }

  private getVisibleContacts(personId: number): ContactInformation[] {
    const contacts = this.personContacts.get(personId) ?? [];
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

  private renderContactColumn(personId: number) {
    const contacts = this.getVisibleContacts(personId).filter(item => !!item.value);

    if (contacts.length === 0) {
      return html`<span class="${textStyles.body.xs} opacity-60">No contact info</span>`;
    }

    return html`
      <div class="space-y-1">
        ${contacts.slice(0, 3).map(
          item => html`
            <div class="flex flex-col">
              <span class="font-medium ${textStyles.table.cellPrimary} text-xs">
                ${item.label || this.getContactTypeLabel(item.type)}
              </span>
              <span class="truncate ${textStyles.table.cellSecondary} text-xs">
                ${this.renderContactValue(item)}
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

  private handlePersonClick(person: Person) {
    if (this.linkToDetail) {
      window.history.pushState({}, '', `/persons/${person.displayId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      this.dispatchEvent(new CustomEvent('person-clicked', {
        detail: { person },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleEditPerson(e: Event, displayId: string) {
    e.stopPropagation();
    window.history.pushState({}, '', `/persons/${displayId}/edit`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  protected renderRow(person: Person): TemplateResult {
    const isAdmin = this.adminPersonIds.includes(person.id);
    const rowClasses = this.linkToDetail
      ? `cursor-pointer ${backgroundColors.contentHover} transition-colors`
      : '';
    const onClick = this.linkToDetail ? () => this.handlePersonClick(person) : undefined;

    return html`
      <tr class="${rowClasses}" @click=${onClick}>
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
                ${this.showAdmin && isAdmin
                  ? html`
                      <span class="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                        Admin
                      </span>
                    `
                  : ''}
              </div>
            </div>
          </div>
        </td>
        ${this.showContacts
          ? html`
              <td class="px-8 py-3 text-sm ${textStyles.table.cellSecondary}">
                ${this.renderContactColumn(person.id)}
              </td>
            `
          : ''}
        ${this.showEdit
          ? html`
              <td class="py-3 pr-8 pl-8 text-right text-sm font-medium whitespace-nowrap">
                <button
                  @click=${(e: Event) => this.handleEditPerson(e, person.displayId)}
                  class="${textColors.link} ${textColors.linkHover} bg-transparent border-none cursor-pointer"
                >
                  Edit<span class="sr-only">, ${person.firstName} ${person.lastName}</span>
                </button>
              </td>
            `
          : ''}
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
          ${this.showContacts
            ? html`
                ${this.renderSortableHeader('contact', 'Contact Information', false)}
              `
            : ''}
          ${this.showEdit
            ? html`
                <th scope="col" class="py-3.5 pr-8 pl-8 text-right ${textStyles.table.header}">
                  <span class="sr-only">Edit</span>
                </th>
              `
            : ''}
        </tr>
      </thead>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'person-list': PersonList;
  }
}
