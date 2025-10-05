import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-button')
export class UIButton extends LitElement {
  static formAssociated = true;

  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.5;
      cursor: pointer;
      transition: all 0.15s;
      width: 100%;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.primary {
      background-color: #3b82f6;
      color: white;
    }

    button.primary:hover:not(:disabled) {
      background-color: #2563eb;
    }

    button.secondary {
      background-color: #6b7280;
      color: white;
    }

    button.secondary:hover:not(:disabled) {
      background-color: #4b5563;
    }

    button.outline {
      background-color: transparent;
      color: #3b82f6;
      border: 1px solid #3b82f6;
    }

    button.outline:hover:not(:disabled) {
      background-color: #eff6ff;
    }

    button.danger {
      background-color: #ef4444;
      color: white;
    }

    button.danger:hover:not(:disabled) {
      background-color: #dc2626;
    }

    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 0.5rem;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  @property({ type: String }) variant: 'primary' | 'secondary' | 'outline' | 'danger' = 'primary';
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) loading = false;

  private handleClick() {
    if (this.type === 'submit') {
      // Find the containing form and submit it
      const form = this.closest('form');
      if (form) {
        // If the form has a submit event listener, trigger it
        // Otherwise submit the form
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  }

  render() {
    return html`
      <button
        type=${this.type}
        class=${this.variant}
        ?disabled=${this.disabled || this.loading}
        @click=${this.handleClick}
      >
        ${this.loading ? html`<span class="spinner"></span>` : ''}
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-button': UIButton;
  }
}
