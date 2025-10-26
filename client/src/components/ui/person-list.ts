import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Person } from '@irl/shared';

@customElement('person-list')
export class PersonList extends LitElement {
  createRenderRoot() {
    return this;
  }

  @property({ type: Array })
  persons: Person[] = [];

  @property({ type: Boolean })
  showAdmin = false;

  @property({ type: Array })
  adminPersonIds: number[] = [];

  @property({ type: Boolean })
  linkToDetail = false;

  @property({ type: Boolean })
  showEdit = true;

  @property({ type: Boolean })
  isLoading = false;

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

  render() {
    if (this.persons.length === 0) {
      return html`
        <tr>
          <td colspan="4" class="px-3 py-8 text-center text-sm text-gray-500">
            No people found.
          </td>
        </tr>
      `;
    }

    return html`
      ${this.persons.map(
        person => {
          const isAdmin = this.adminPersonIds.includes(person.id);
          const rowClasses = this.linkToDetail
            ? 'cursor-pointer hover:bg-gray-50 transition-colors'
            : '';

          return html`
            <tr class="${rowClasses}" @click=${() => this.linkToDetail && this.handlePersonClick(person)}>
              <td class="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                <div class="flex items-center">
                  <div class="size-11 shrink-0">
                    ${person.imageURL
                      ? html`
                          <img
                            src="${person.imageURL}"
                            alt=""
                            class="size-11 rounded-full"
                          />
                        `
                      : html`
                          <div
                            class="size-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-sm"
                          >
                            ${this.getInitials(person.firstName, person.lastName)}
                          </div>
                        `}
                  </div>
                  <div class="ml-4">
                    <div class="font-medium text-gray-900 flex items-center gap-2">
                      <span>${person.firstName} ${person.lastName}</span>
                      ${this.showAdmin && isAdmin
                        ? html`
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                              Admin
                            </span>
                          `
                        : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                <div class="text-gray-900">${person.displayId}</div>
              </td>
              <td class="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                ${person.pronouns || html`<span class="text-gray-400">—</span>`}
              </td>
              ${this.showEdit
                ? html`
                    <td class="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                      <button
                        @click=${(e: Event) => this.handleEditPerson(e, person.displayId)}
                        class="text-indigo-600 hover:text-indigo-900 bg-transparent border-none cursor-pointer"
                      >
                        Edit<span class="sr-only">, ${person.firstName} ${person.lastName}</span>
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
    'person-list': PersonList;
  }
}
