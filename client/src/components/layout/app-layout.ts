import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { backgroundColors, textColors } from '../../utilities/text-colors.js';
import './masquerade-banner.js';

@customElement('app-layout')
export class AppLayout extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';

  render() {
    return html`
      <div class="block min-h-screen ${backgroundColors.pageAlt}">
        <masquerade-banner></masquerade-banner>
        <div class="max-w-7xl mx-auto px-4 py-8">
          ${this.loading
            ? html`
                <div class="flex items-center justify-center min-h-[50vh]">
                  <div class="w-12 h-12 border-4 ${backgroundColors.border} border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              `
            : this.error
            ? html`
                <div class="flex items-center justify-center min-h-[50vh] ${textColors.error} text-base">
                  ${this.error}
                </div>
              `
            : html`<slot></slot>`}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-layout': AppLayout;
  }
}
