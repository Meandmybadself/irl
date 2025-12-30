import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { UserWithMetadata } from '@irl/shared';
import { textStyles, backgroundColors, textColors } from '../../utilities/text-colors.js';
import { BaseList, SortableColumn } from './base-list.js';
import { renderIcon } from '../../utilities/icons.js';

@customElement('user-list')
export class UserList extends BaseList<UserWithMetadata> {
  @property({ type: Array })
  users: UserWithMetadata[] = [];

  // Map users to items for base class
  get items(): UserWithMetadata[] {
    return this.users;
  }

  @property({ type: Number })
  currentUserId: number | null = null;

  @property({ type: Boolean })
  showActions = true;

  protected getColumnCount(): number {
    return this.showActions ? 6 : 5; // Email, Admin, Persons, Created, Verified, Actions
  }

  protected getColumns(): SortableColumn<UserWithMetadata>[] {
    return [
      {
        id: 'email',
        label: 'Email',
        sortable: true,
        getSortValue: (user) => user.email.toLowerCase(),
      },
      {
        id: 'admin',
        label: 'Admin',
        sortable: true,
        getSortValue: (user) => user.isSystemAdmin ? 1 : 0,
      },
      {
        id: 'persons',
        label: 'Persons',
        sortable: true,
        getSortValue: (user) => user.personCount,
      },
      {
        id: 'created',
        label: 'Created',
        sortable: true,
        getSortValue: (user) => new Date(user.createdAt).getTime(),
      },
      {
        id: 'verified',
        label: 'Verified',
        sortable: true,
        getSortValue: (user) => user.isEmailVerified ? 1 : 0,
      },
      {
        id: 'actions',
        label: 'Actions',
        sortable: false,
      },
    ];
  }

  protected getSearchableText(user: UserWithMetadata): string {
    return [
      user.email,
      user.isSystemAdmin ? 'admin' : '',
      user.isEmailVerified ? 'verified' : 'unverified',
    ].filter(Boolean).join(' ');
  }

  protected getEmptyStateMessage(): string {
    return 'No users found.';
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  private handleEditUser(e: Event, userId: number) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('edit-user', {
      detail: { userId },
      bubbles: true,
      composed: true
    }));
  }

  private handleDeleteUser(e: Event, user: UserWithMetadata) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('delete-user', {
      detail: { user },
      bubbles: true,
      composed: true
    }));
  }

  protected renderRow(user: UserWithMetadata): TemplateResult {
    const isCurrentUser = this.currentUserId === user.id;

    return html`
      <tr class="${backgroundColors.content}">
        <!-- Email -->
        <td class="py-3 pr-8 pl-8 text-sm ${textStyles.table.cellPrimary}">
          <div class="flex items-center gap-2">
            <span class="font-medium">${user.email}</span>
            ${isCurrentUser
              ? html`
                  <span class="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                    You
                  </span>
                `
              : ''}
          </div>
        </td>

        <!-- Admin Status -->
        <td class="py-3 pr-8 pl-8 text-sm ${textStyles.table.cellSecondary}">
          ${user.isSystemAdmin
            ? html`
                <span class="inline-flex items-center gap-1 ${textColors.primary}">
                  ${renderIcon('Shield', 'w-4 h-4')}
                  <span>Yes</span>
                </span>
              `
            : html`<span class="opacity-50">No</span>`}
        </td>

        <!-- Person Count -->
        <td class="py-3 pr-8 pl-8 text-sm ${textStyles.table.cellSecondary} text-center">
          ${user.personCount > 0
            ? html`
                <span class="inline-flex items-center gap-1">
                  ${renderIcon('Users', 'w-4 h-4')}
                  <span>${user.personCount}</span>
                </span>
              `
            : html`<span class="opacity-50">0</span>`}
        </td>

        <!-- Created Date -->
        <td class="py-3 pr-8 pl-8 text-sm ${textStyles.table.cellSecondary}">
          ${this.formatDate(user.createdAt)}
        </td>

        <!-- Verification Status -->
        <td class="py-3 pr-8 pl-8 text-sm ${textStyles.table.cellSecondary}">
          ${user.isEmailVerified
            ? html`
                <span class="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  ${renderIcon('CheckCircle', 'w-4 h-4')}
                  <span>Verified</span>
                </span>
              `
            : html`
                <span class="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  ${renderIcon('Clock', 'w-4 h-4')}
                  <span>Pending</span>
                </span>
              `}
        </td>

        <!-- Actions -->
        ${this.showActions
          ? html`
              <td class="py-3 pr-8 pl-8 text-right text-sm font-medium whitespace-nowrap">
                <button
                  @click=${(e: Event) => this.handleEditUser(e, user.id)}
                  class="${textColors.link} ${textColors.linkHover} bg-transparent border-none cursor-pointer mr-3"
                >
                  Edit
                </button>
                <button
                  @click=${(e: Event) => this.handleDeleteUser(e, user)}
                  ?disabled=${isCurrentUser}
                  class="${isCurrentUser
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300'} bg-transparent border-none cursor-pointer"
                  title=${isCurrentUser ? 'Cannot delete your own account' : 'Delete user'}
                >
                  Delete
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
          ${this.renderSortableHeader('email', 'Email', true)}
          ${this.renderSortableHeader('admin', 'Admin', true)}
          ${this.renderSortableHeader('persons', 'Persons', true)}
          ${this.renderSortableHeader('created', 'Created', true)}
          ${this.renderSortableHeader('verified', 'Verified', true)}
          ${this.showActions
            ? html`
                <th scope="col" class="py-3.5 pr-8 pl-8 text-right ${textStyles.table.header}">
                  Actions
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
    'user-list': UserList;
  }
}
