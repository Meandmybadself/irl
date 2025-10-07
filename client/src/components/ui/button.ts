import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-button')
export class UIButton extends LitElement {
  static formAssociated = true;

  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

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

  private getButtonClasses() {
    const baseClasses = 'inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all w-full disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary: 'bg-blue-500 text-white hover:bg-blue-600 disabled:hover:bg-blue-500',
      secondary: 'bg-gray-500 text-white hover:bg-gray-600 disabled:hover:bg-gray-500',
      outline: 'bg-transparent text-blue-500 border border-blue-500 hover:bg-blue-50 disabled:hover:bg-transparent',
      danger: 'bg-red-500 text-white hover:bg-red-600 disabled:hover:bg-red-500'
    };

    return `${baseClasses} ${variantClasses[this.variant]}`;
  }

  render() {
    return html`
      <button
        type=${this.type}
        class=${this.getButtonClasses()}
        ?disabled=${this.disabled || this.loading}
        @click=${this.handleClick}
      >
        ${this.loading ? html`<span class="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin mr-2"></span>` : ''}
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
