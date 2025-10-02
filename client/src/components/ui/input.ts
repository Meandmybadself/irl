import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-input')
export class UIInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      line-height: 1.5;
      transition: all 0.15s;
    }

    input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    input:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
    }

    input.error {
      border-color: #ef4444;
    }

    input.error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .error-message {
      font-size: 0.875rem;
      color: #ef4444;
    }
  `;

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
      <div class="input-wrapper">
        ${this.label
          ? html`<label for=${this.name}>${this.label}${this.required ? ' *' : ''}</label>`
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
          class=${this.error ? 'error' : ''}
          @input=${this.handleInput}
        />
        ${this.error ? html`<span class="error-message">${this.error}</span>` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-input': UIInput;
  }
}
