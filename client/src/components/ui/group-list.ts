import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Group } from '@irl/shared';

@customElement('group-list')
export class GroupList extends LitElement {
  createRenderRoot() {
    return this;
  }

  @property({ type: Array })
  groups: Group[] = [];

  @property({ type: Boolean })
  showAdmin = false;

  @property({ type: Array })
  adminGroupIds: number[] = [];

  @property({ type: Boolean })
  linkToDetail = false;

  @property({ type: Boolean })
  showEdit = true;

  @property({ type: Boolean })
  isLoading = false;

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

  render() {
    if (this.groups.length === 0) {
      return html`
        <tr>
          <td colspan="5" class="px-3 py-8 text-center text-sm text-gray-500">
            No groups found.
          </td>
        </tr>
      `;
    }

    return html`
      ${this.groups.map(
        group => {
          const isAdmin = this.adminGroupIds.includes(group.id);
          const rowClasses = this.linkToDetail
            ? 'cursor-pointer hover:bg-gray-50 transition-colors'
            : '';

          return html`
            <tr class="${rowClasses}" @click=${() => this.linkToDetail && this.handleGroupClick(group)}>
              <td class="py-2 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0">
                <div class="flex items-center gap-2">
                  <span>${group.name}</span>
                  ${this.showAdmin && isAdmin
                    ? html`
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          Admin
                        </span>
                      `
                    : ''}
                </div>
              </td>
              <td class="px-2 py-2 text-sm whitespace-nowrap text-gray-500">
                ${group.displayId}
              </td>
              <td class="px-2 py-2 text-sm whitespace-nowrap text-gray-500">
                ${group.description || html`<span class="text-gray-400">—</span>`}
              </td>
              <td class="px-2 py-2 text-sm whitespace-nowrap text-gray-500">
                ${group.publiclyVisible
                  ? html`<span class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">Public</span>`
                  : html`<span class="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-500/20 ring-inset">Private</span>`}
              </td>
              ${this.showEdit
                ? html`
                    <td class="py-2 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                      <button
                        @click=${(e: Event) => this.handleEditGroup(e, group.displayId)}
                        class="text-indigo-600 hover:text-indigo-900 bg-transparent border-none cursor-pointer"
                      >
                        Edit<span class="sr-only">, ${group.name}</span>
                      </button>
                    </td>
                  `
                : ''}
            </tr>
          `;
        }
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-list': GroupList;
  }
}
