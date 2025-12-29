import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../../contexts/store-context.js';
import { apiContext } from '../../contexts/api-context.js';
import { clearMasquerade } from '../../store/slices/masquerade.js';
import { addNotification } from '../../store/slices/ui.js';
import type { AppStore } from '../../store/index.js';
import type { ApiClient } from '../../services/api-client.js';

@customElement('masquerade-banner')
export class MasqueradeBanner extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext, subscribe: true })
  @state()
  private store!: AppStore;

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @state()
  private isExiting = false;

  private async handleExit() {
    this.isExiting = true;

    try {
      await this.api.exitMasquerade();

      this.store.dispatch(clearMasquerade());
      this.store.dispatch(addNotification('Masquerade mode ended', 'success'));

      // Reload the page to refresh with original user context
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to exit masquerade',
          'error'
        )
      );
      this.isExiting = false;
    }
  }

  render() {
    const state = this.store.getState();
    const { isMasquerading, originalUserEmail, masqueradeUserEmail } = state.masquerade;

    if (!isMasquerading) {
      return html``;
    }

    return html`
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border-b-2 border-yellow-400 dark:border-yellow-600">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300">
                MASQUERADE MODE
              </span>
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                <span class="font-semibold">${originalUserEmail}</span> viewing as
                <span class="font-semibold">${masqueradeUserEmail}</span>
              </p>
            </div>
            <button
              @click=${this.handleExit}
              ?disabled=${this.isExiting}
              class="inline-flex items-center gap-2 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-yellow-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ${this.isExiting
                ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin"></span>`
                : ''}
              Exit Masquerade
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'masquerade-banner': MasqueradeBanner;
  }
}
