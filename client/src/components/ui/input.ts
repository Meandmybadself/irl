import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-input')
export class UIInput extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @property({ type: String }) label = '';
  @property({ type: String }) name = '';
  @property({ type: String }) type = 'text';
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) error = '';
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) autocomplete = '';

  private handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(
      new CustomEvent('input-change', {
        detail: { name: this.name, value: this.value },
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
      <div class="flex flex-col gap-2">
        ${this.label
          ? html`<label for=${this.name} class="text-sm font-medium text-gray-700">${this.label}${this.required ? ' *' : ''}</label>`
          : ''}
        <input
          id=${this.name}
          name=${this.name}
          type=${this.type}
          .value=${this.value}
          placeholder=${this.placeholder}
          ?required=${this.required}
          ?disabled=${this.disabled}
          autocomplete=${this.autocomplete}
          class=${this.error
            ? 'w-full px-3 py-2 border border-red-500 rounded-md text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed'
            : 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed'}
          @input=${this.handleInput}
        />
        ${this.error ? html`<span class="text-sm text-red-500">${this.error}</span>` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-input': UIInput;
  }
}
