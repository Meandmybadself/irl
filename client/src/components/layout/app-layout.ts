import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './navigation.js';

@customElement('app-layout')
export class AppLayout extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) showNav = true;
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';

  render() {
    return html`
      <div class="block min-h-screen bg-gray-50">
        ${this.showNav ? html`<app-navigation></app-navigation>` : ''}

        <div class="max-w-7xl mx-auto px-4 ${this.showNav ? 'pt-24 pb-8' : 'py-8'}">
          ${this.loading
            ? html`
                <div class="flex items-center justify-center min-h-[50vh]">
                  <div class="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              `
            : this.error
            ? html`
                <div class="flex items-center justify-center min-h-[50vh] text-red-500 text-base">
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
