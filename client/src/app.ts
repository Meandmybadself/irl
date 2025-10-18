import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit-labs/context';
import { Router } from '@lit-labs/router';
import { apiClient } from './services/api-client.js';
import { createAppStore, type AppStore } from './store/index.js';
import { checkSession } from './store/slices/auth.js';
import { loadSystem } from './store/slices/system.js';
import { storeContext } from './contexts/store-context.js';
import { apiContext } from './contexts/api-context.js';
import { createRoutes } from './router.js';
import { updateDocumentTitle, getPageNameFromPath } from './utilities/title.js';
import { selectSystemName, selectIsAuthenticated } from './store/selectors.js';
import './components/ui/notification.js';
import './components/layout/navigation.js';

@customElement('app-root')
export class AppRoot extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

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

  @state()
  private isAuthenticated = false;

  private router = new Router(this, []);
  private unsubscribe?: () => void;
  private boundPopStateHandler?: () => void;

  private updateTitle() {
    const state = this.store.getState();
    const systemName = selectSystemName(state);
    const pageName = getPageNameFromPath(window.location.pathname);
    updateDocumentTitle(pageName, systemName);
  }

  private handlePopState() {
    this.updateTitle();
    this.requestUpdate();
  }

  async connectedCallback() {
    super.connectedCallback();

    // Initialize store
    this.store = createAppStore(this.api);

    // Check for existing session and load system data
    try {
      await Promise.all([
        this.store.dispatch(checkSession()),
        this.store.dispatch(loadSystem())
      ]);
    } catch (error) {
      // Session check failed, user is not logged in
      console.log('No active session');
    } finally {
      this.isInitializing = false;

      // Initialize routes after session check
      const routes = createRoutes(this.store);
      this.router.routes = routes;

      // Force router to update after routes are set
      this.router.goto(window.location.pathname);

      // Update title after initial load
      this.updateTitle();

      this.boundPopStateHandler = this.handlePopState.bind(this);
      window.addEventListener('popstate', this.boundPopStateHandler);

      // Subscribe to store changes to update authentication state
      this.unsubscribe = this.store.subscribe(() => {
        const state = this.store.getState();
        this.isAuthenticated = selectIsAuthenticated(state);
      });

      // Set initial auth state
      const state = this.store.getState();
      this.isAuthenticated = selectIsAuthenticated(state);

      this.requestUpdate();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    if (this.boundPopStateHandler) {
      window.removeEventListener('popstate', this.boundPopStateHandler);
    }
  }

  private shouldShowNavigation(): boolean {
    const path = window.location.pathname;
    // Don't show navigation on login, register, or verify-email pages
    return this.isAuthenticated &&
           path !== '/login' &&
           path !== '/register' &&
           path !== '/verify-email';
  }

  render() {
    if (this.isInitializing) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
        </div>
      `;
    }

    const showNav = this.shouldShowNavigation();

    return html`
      <ui-notifications></ui-notifications>
      ${showNav ? html`<app-navigation></app-navigation>` : ''}
      ${showNav ? html`<div class="h-16"></div>` : ''}
      ${this.router.outlet()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-root': AppRoot;
  }
}
