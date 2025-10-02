import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './navigation.js';

@customElement('app-layout')
export class AppLayout extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #f9fafb;
    }

    .content {
      max-width: 80rem;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
    }

    .spinner {
      width: 3rem;
      height: 3rem;
      border: 4px solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      color: #ef4444;
      font-size: 1rem;
    }
  `;

  @property({ type: Boolean }) showNav = true;
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';

  render() {
    return html`
      ${this.showNav ? html`<app-navigation></app-navigation>` : ''}

      <div class="content">
        ${this.loading
          ? html`
              <div class="loading">
                <div class="spinner"></div>
              </div>
            `
          : this.error
          ? html`
              <div class="error">
                ${this.error}
              </div>
            `
          : html`<slot></slot>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-layout': AppLayout;
  }
}
