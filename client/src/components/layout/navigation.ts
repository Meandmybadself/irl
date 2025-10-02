import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../../contexts/store-context.js';
import { logout } from '../../store/slices/auth.js';
import { selectCurrentPerson, selectIsAuthenticated } from '../../store/selectors.js';
import type { AppStore } from '../../store/index.js';

@customElement('app-navigation')
export class AppNavigation extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    nav {
      background-color: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 0 1rem;
    }

    .container {
      max-width: 80rem;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 4rem;
    }

    .logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      text-decoration: none;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .nav-links a {
      color: #6b7280;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: color 0.15s;
    }

    .nav-links a:hover {
      color: #111827;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-name {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .logout-button {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s;
      padding: 0;
    }

    .logout-button:hover {
      color: #111827;
    }

    .mobile-menu-button {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .nav-links {
        display: none;
      }

      .mobile-menu-button {
        display: block;
      }

      .nav-links.mobile-open {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 4rem;
        left: 0;
        right: 0;
        background: white;
        border-bottom: 1px solid #e5e7eb;
        padding: 1rem;
        gap: 1rem;
      }
    }
  `;

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
      <nav>
        <div class="container">
          <a href="/" class="logo">IRL</a>

          ${this.isAuthenticated
            ? html`
                <button class="mobile-menu-button" @click=${this.toggleMobileMenu}>
                  ☰
                </button>

                <div class="nav-links ${this.mobileMenuOpen ? 'mobile-open' : ''}">
                  <a href="/home">Home</a>
                  <div class="user-menu">
                    ${this.currentPerson
                      ? html`
                          <span class="user-name">
                            ${this.currentPerson.firstName} ${this.currentPerson.lastName}
                          </span>
                        `
                      : ''}
                    <button class="logout-button" @click=${this.handleLogout}>
                      Sign Out
                    </button>
                  </div>
                </div>
              `
            : ''}
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
