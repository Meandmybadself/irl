import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Group, ContactInformation } from '@irl/shared';
import { ContactType, PrivacyLevel } from '@irl/shared';
import { textStyles, backgroundColors, textColors } from '../../utilities/text-colors.js';
import { BaseList, SortableColumn } from './base-list.js';

@customElement('group-list')
export class GroupList extends BaseList<Group> {
  @property({ type: Array })
  groups: Group[] = [];

  // Map groups to items for base class
  get items(): Group[] {
    return this.groups;
  }

  @property({ type: Boolean })
  showAdmin = false;

  @property({ type: Array })
  adminGroupIds: number[] = [];

  @property({ type: Boolean })
  linkToDetail = false;

  @property({ type: Boolean })
  showEdit = true;

  @property({ type: Object })
  groupContacts: Map<number, ContactInformation[]> = new Map();

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

  protected getColumns(): SortableColumn<Group>[] {
    return [
      {
        id: 'name',
        label: 'Name',
        sortable: true,
        getSortValue: (group) => group.name.toLowerCase(),
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

  protected getSearchableText(group: Group): string {
    const contactTexts: string[] = [];
    const contacts = this.getVisibleContacts(group.id);
    contacts.forEach(contact => {
      if (contact.value) {
        contactTexts.push(contact.value);
        if (contact.label) {
          contactTexts.push(contact.label);
        }
      }
    });

    return [
      group.name,
      group.displayId,
      group.description || '',
      ...contactTexts,
    ].filter(Boolean).join(' ');
  }

  protected getEmptyStateMessage(): string {
    return 'No groups found.';
  }

  private handleGroupClick(group: Group) {
    if (this.linkToDetail) {
      window.history.pushState({}, '', `/groups/${group.displayId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      this.dispatchEvent(new CustomEvent('group-clicked', {
        detail: { group },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleEditGroup(e: Event, displayId: string) {
    e.stopPropagation();
    window.history.pushState({}, '', `/groups/${displayId}/edit`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private getVisibleContacts(groupId: number): ContactInformation[] {
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

  private renderContactValue(item: ContactInformation) {
    const value = item.value ?? '';

    switch (item.type) {
      case ContactType.EMAIL:
        return html`<a
          href="mailto:${value}"
          class="${textColors.link} ${textColors.linkHover}"
        >
          ${value}
        </a>`;
      case ContactType.PHONE:
        return html`<a
          href="tel:${value}"
          class="${textColors.link} ${textColors.linkHover}"
        >
          ${value}
        </a>`;
      case ContactType.URL:
        return html`<a
          href="${value}"
          target="_blank"
          rel="noopener noreferrer"
          class="${textColors.link} ${textColors.linkHover}"
        >
          ${value}
        </a>`;
      default:
        return html`${value}`;
    }
  }

  private renderContactColumn(groupId: number) {
    const contacts = this.getVisibleContacts(groupId).filter(item => !!item.value);

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

  protected renderRow(group: Group): TemplateResult {
    const isAdmin = this.adminGroupIds.includes(group.id);
    const rowClasses = this.linkToDetail
      ? `cursor-pointer ${backgroundColors.contentHover} transition-colors`
      : '';
    const onClick = this.linkToDetail ? () => this.handleGroupClick(group) : undefined;

    return html`
      <tr class="${rowClasses}" @click=${onClick}>
        <td class="py-3 pr-8 pl-8 text-sm ${textStyles.table.cellPrimary} max-w-xs">
          <div class="flex items-center gap-2">
            <span class="font-semibold">${group.name}</span>
            ${this.showAdmin && isAdmin
              ? html`
                  <span class="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                    Admin
                  </span>
                `
              : ''}
          </div>
        </td>
        ${this.showContacts
          ? html`
              <td class="px-8 py-3 text-sm ${textStyles.table.cellSecondary}">
                ${this.renderContactColumn(group.id)}
              </td>
            `
          : ''}
        ${this.showEdit
          ? html`
              <td class="py-3 pr-8 pl-8 text-right text-sm font-medium whitespace-nowrap">
                <button
                  @click=${(e: Event) => this.handleEditGroup(e, group.displayId)}
                  class="text-indigo-600 hover:text-indigo-500 bg-transparent border-none cursor-pointer dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Edit<span class="sr-only">, ${group.name}</span>
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
    'group-list': GroupList;
  }
}
