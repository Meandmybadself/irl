import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Group } from '@irl/shared';
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

  private getColumnCount(): number {
    let count = 1; // Name
    if (this.showEdit) {
      count += 1;
    }
    return count;
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
        <td class="py-5 pr-8 pl-8 text-sm ${textStyles.table.cellPrimary}">
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
        ${this.showEdit
          ? html`
              <td class="py-5 pr-8 pl-8 text-right text-sm font-medium whitespace-nowrap">
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
          <th scope="col" class="py-3.5 pr-8 pl-8 text-left ${textStyles.table.header}">
            Name
          </th>
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
