import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { selectCurrentPerson } from '../store/selectors.js';
import type { AppStore } from '../store/index.js';
import '../components/layout/app-layout.js';

@customElement('home-page')
export class HomePage extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

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
        <div class="bg-white p-8 rounded-lg shadow-sm mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-4">Welcome, ${firstName}! 👋</h1>
          <p class="text-base text-gray-600 leading-relaxed">
            Your community directory for exchanging contact information and staying connected.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <a href="/persons" class="block bg-white p-6 rounded-lg shadow-sm no-underline text-inherit transition-all border-2 border-transparent hover:shadow-md hover:border-blue-500">
            <div class="text-4xl mb-3">👥</div>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">
              People
            </h2>
            <p class="text-sm text-gray-600 leading-relaxed">Browse and manage people in your directory</p>
          </a>

          <a href="/groups" class="block bg-white p-6 rounded-lg shadow-sm no-underline text-inherit transition-all border-2 border-transparent hover:shadow-md hover:border-blue-500">
            <div class="text-4xl mb-3">📂</div>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">
              Groups <span class="inline-block text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium ml-2">Coming Soon</span>
            </h2>
            <p class="text-sm text-gray-600 leading-relaxed">Browse and manage your groups</p>
          </a>

          <a href="/contact" class="block bg-white p-6 rounded-lg shadow-sm no-underline text-inherit transition-all border-2 border-transparent hover:shadow-md hover:border-blue-500">
            <div class="text-4xl mb-3">📞</div>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">
              Contact Info <span class="inline-block text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium ml-2">Coming Soon</span>
            </h2>
            <p class="text-sm text-gray-600 leading-relaxed">Manage your contact information</p>
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
