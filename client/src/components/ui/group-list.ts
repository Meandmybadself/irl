import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ContactInformation, Group } from '@irl/shared';
import { ContactType, PrivacyLevel } from '@irl/shared';
import { textStyles, backgroundColors } from '../../utilities/text-colors.js';

@customElement('group-list')
export class GroupList extends LitElement {
  createRenderRoot() {
    return this;
  }

  @property({ type: Array })
  groups: Group[] = [];

  @property({ type: Boolean })
  showAdmin = false;

  @property({ type: Boolean })
  showHeader = true;

  @property({ type: Array })
  adminGroupIds: number[] = [];

  @property({ type: Boolean })
  linkToDetail = false;

  @property({ type: Boolean })
  showEdit = true;

  @property({ type: Boolean })
  isLoading = false;

  @property({ attribute: false })
  groupContacts: Map<number, ContactInformation[]> = new Map();

  @property({ type: Boolean })
  showPrivateContacts = false;

  @property({ type: Boolean })
  showContacts = true;

  private getColumnCount(): number {
    let count = 3; // Name, Display ID, Visibility
    if (this.showContacts) {
      count += 1;
    }
    if (this.showEdit) {
      count += 1;
    }
    return count;
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
          class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          ${value}
        </a>`;
      case ContactType.PHONE:
        return html`<a
          href="tel:${value}"
          class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          ${value}
        </a>`;
      case ContactType.URL:
        return html`<a
          href="${value}"
          target="_blank"
          rel="noopener noreferrer"
          class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          ${value}
        </a>`;
      default:
        return html`<span class="${textStyles.table.cell}">${value}</span>`;
    }
  }

  private renderContactSummary(groupId: number) {
    if (!this.showContacts) {
      return '';
    }

    const contacts = this.getVisibleContacts(groupId);

    if (contacts.length === 0) {
      return html`<span class="${textStyles.body.xs} opacity-60">No contact info</span>`;
    }

    const entries = contacts
      .filter(item => !!item.value)
      .slice(0, 2);

    return html`
      <div class="space-y-1 text-xs">
        ${entries.map(
          item => html`
            <div class="flex flex-col">
              <span class="font-medium ${textStyles.table.cell}">
                ${item.label || this.getContactTypeLabel(item.type)}
              </span>
              <span class="truncate ${textStyles.table.cellSecondary}">
                ${this.renderContactValue(item)}
              </span>
            </div>
          `
        )}
      </div>
    `;
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

  private renderRow(group: Group) {
    const isAdmin = this.adminGroupIds.includes(group.id);
    const rowClasses = this.linkToDetail
      ? `cursor-pointer ${backgroundColors.contentHover} transition-colors`
      : '';
    const onClick = this.linkToDetail ? () => this.handleGroupClick(group) : undefined;

    return html`
      <tr class="${rowClasses}" @click=${onClick}>
        <td class="py-5 pr-3 pl-4 text-sm ${textStyles.table.cellPrimary} sm:pl-0">
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
          <div class="mt-1 ${textStyles.body.xs} opacity-60">
            ${group.description || html`<span class="italic ${textStyles.body.xs} opacity-40">No description</span>`}
          </div>
        </td>
        ${this.showContacts
          ? html`
              <td class="px-3 py-5 text-sm ${textStyles.table.cellSecondary} align-top">
                ${this.renderContactSummary(group.id)}
              </td>
            `
          : ''}
        <td class="px-3 py-5 text-sm ${textStyles.table.cellSecondary} whitespace-nowrap">
          <span class="${textStyles.table.cellPrimary} font-medium">${group.displayId}</span>
        </td>
        <td class="px-3 py-5 text-sm ${textStyles.table.cellSecondary} whitespace-nowrap">
          ${group.publiclyVisible
            ? html`<span class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium ${textStyles.status.public} ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:ring-green-500/50">Public</span>`
            : html`<span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium ${textStyles.status.private} ring-1 ring-inset ring-gray-500/20 dark:bg-gray-800/60 dark:text-gray-200 dark:ring-gray-500/40">Private</span>`}
        </td>
        ${this.showEdit
          ? html`
              <td class="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
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

  private renderHeader() {
    if (!this.showHeader) {
      return '';
    }

    return html`
      <thead>
        <tr>
          <th scope="col" class="py-3.5 pr-3 pl-4 text-left ${textStyles.table.header} sm:pl-0">
            Name
          </th>
          ${this.showContacts
            ? html`
                <th scope="col" class="px-3 py-3.5 text-left ${textStyles.table.header}">
                  Contact
                </th>
              `
            : ''}
          <th scope="col" class="px-3 py-3.5 text-left ${textStyles.table.header}">
            Display ID
          </th>
          <th scope="col" class="px-3 py-3.5 text-left ${textStyles.table.header}">
            Visibility
          </th>
          ${this.showEdit
            ? html`
                <th scope="col" class="py-3.5 pr-4 pl-3 text-right ${textStyles.table.header} sm:pr-0">
                  <span class="sr-only">Edit</span>
                </th>
              `
            : ''}
        </tr>
      </thead>
    `;
  }

  private renderBody() {
    if (this.groups.length === 0) {
      return html`
        <tr>
          <td colspan="${this.getColumnCount()}" class="px-3 py-8 text-center ${textStyles.table.cellSecondary}">
            ${this.isLoading ? 'Loading groups...' : 'No groups found.'}
          </td>
        </tr>
      `;
    }

    return html`${this.groups.map(group => this.renderRow(group))}`;
  }

  render() {
    return html`
      <table class="relative min-w-full divide-y ${backgroundColors.divideStrong}">
        ${this.renderHeader()}
        <tbody class="divide-y ${backgroundColors.divide}">
          ${this.renderBody()}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-list': GroupList;
  }
}
