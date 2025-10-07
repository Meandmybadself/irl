import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../../contexts/store-context.js';
import { logout } from '../../store/slices/auth.js';
import { selectCurrentPerson, selectIsAuthenticated } from '../../store/selectors.js';
import type { AppStore } from '../../store/index.js';

@customElement('app-navigation')
export class AppNavigation extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext, subscribe: true })
  @state()
  private store!: AppStore;

  @state()
  private isAuthenticated = false;

  @state()
  private currentPerson: any = null;

  @state()
  private mobileMenuOpen = false;

  private unsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this.updateState();
      this.unsubscribe = this.store.subscribe(() => {
        this.updateState();
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private updateState() {
    const state = this.store.getState();
    this.isAuthenticated = selectIsAuthenticated(state);
    this.currentPerson = selectCurrentPerson(state);
  }

  private async handleLogout() {
    await this.store.dispatch(logout());
    window.location.href = '/login';
  }

  private toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  render() {
    return html`
      <nav class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <a href="/" class="text-xl font-bold text-gray-900 no-underline">IRL</a>

            ${this.isAuthenticated
              ? html`
                  <button
                    class="md:hidden p-2 text-gray-600 hover:text-gray-900 bg-transparent border-none cursor-pointer"
                    @click=${this.toggleMobileMenu}
                  >
                    ☰
                  </button>

                  <div class="${this.mobileMenuOpen
                    ? 'flex flex-col absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-4 gap-4 md:flex md:flex-row md:static md:gap-8 md:p-0 md:border-0 md:items-center'
                    : 'hidden md:flex md:flex-row md:gap-8 md:items-center'}">
                    <a href="/home" class="text-sm font-medium text-gray-600 hover:text-gray-900 no-underline transition-colors">
                      Home
                    </a>
                    <div class="flex items-center gap-4">
                      ${this.currentPerson
                        ? html`
                            <span class="text-sm text-gray-600">
                              ${this.currentPerson.firstName} ${this.currentPerson.lastName}
                            </span>
                          `
                        : ''}
                      <button
                        class="text-sm font-medium text-gray-600 hover:text-gray-900 bg-transparent border-none cursor-pointer p-0 transition-colors"
                        @click=${this.handleLogout}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                `
              : ''}
          </div>
        </div>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-navigation': AppNavigation;
  }
}
