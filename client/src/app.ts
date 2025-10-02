import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit-labs/context';
import { Router } from '@lit-labs/router';
import { apiClient } from './services/api-client.js';
import { createAppStore, type AppStore } from './store/index.js';
import { checkSession } from './store/slices/auth.js';
import { storeContext } from './contexts/store-context.js';
import { apiContext } from './contexts/api-context.js';
import { createRoutes } from './router.js';
import './components/ui/notification.js';

@customElement('app-root')
export class AppRoot extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background-color: #f9fafb;
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
  `;

  @provide({ context: storeContext })
  @state()
  private store!: AppStore;

  @provide({ context: apiContext })
  @state()
  private api = apiClient;

  @state()
  private isInitializing = true;

  private router = new Router(this, []);

  async connectedCallback() {
    super.connectedCallback();

    // Initialize store
    this.store = createAppStore(this.api);

    // Check for existing session
    try {
      await this.store.dispatch(checkSession());
    } catch (error) {
      // Session check failed, user is not logged in
      console.log('No active session');
    } finally {
      this.isInitializing = false;

      // Initialize routes after session check
      const routes = createRoutes(this.store);
      this.router.routes = routes;

      this.requestUpdate();
    }
  }

  render() {
    if (this.isInitializing) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
        </div>
      `;
    }

    return html`
      <ui-notifications></ui-notifications>
      ${this.router.outlet()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-root': AppRoot;
  }
}
