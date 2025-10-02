import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { selectCurrentPerson } from '../store/selectors.js';
import type { AppStore } from '../store/index.js';
import '../components/layout/app-layout.js';

@customElement('home-page')
export class HomePage extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .welcome {
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 1rem 0;
    }

    .subtitle {
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.5;
    }

    .quick-links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .link-card {
      background: white;
      padding: 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      text-decoration: none;
      color: inherit;
      transition: all 0.15s;
      border: 2px solid transparent;
    }

    .link-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-color: #3b82f6;
    }

    .link-card h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }

    .link-card p {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
    }

    .icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
    }

    .coming-soon {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background-color: #fef3c7;
      color: #92400e;
      border-radius: 0.25rem;
      font-weight: 500;
      margin-left: 0.5rem;
    }
  `;

  @consume({ context: storeContext, subscribe: true })
  @state()
  private store!: AppStore;

  @state()
  private currentPerson: any = null;

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
    this.currentPerson = selectCurrentPerson(state);
  }

  render() {
    const firstName = this.currentPerson?.firstName || 'there';

    return html`
      <app-layout>
        <div class="welcome">
          <h1>Welcome, ${firstName}! 👋</h1>
          <p class="subtitle">
            Your community directory for exchanging contact information and staying connected.
          </p>
        </div>

        <div class="quick-links">
          <a href="/groups" class="link-card">
            <div class="icon">👥</div>
            <h2>Groups <span class="coming-soon">Coming Soon</span></h2>
            <p>Browse and manage your groups</p>
          </a>

          <a href="/directory" class="link-card">
            <div class="icon">📖</div>
            <h2>Directory <span class="coming-soon">Coming Soon</span></h2>
            <p>Search the community directory</p>
          </a>

          <a href="/contact" class="link-card">
            <div class="icon">📞</div>
            <h2>Contact Info <span class="coming-soon">Coming Soon</span></h2>
            <p>Manage your contact information</p>
          </a>
        </div>
      </app-layout>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'home-page': HomePage;
  }
}
