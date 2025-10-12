import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../../contexts/store-context.js';
import { logout } from '../../store/slices/auth.js';
import { selectCurrentPerson, selectCurrentUser, selectIsAuthenticated, selectIsSystemAdmin } from '../../store/selectors.js';
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
  private currentUser: any = null;

  @state()
  private isSystemAdmin = false;

  @state()
  private mobileMenuOpen = false;

  @state()
  private profileMenuOpen = false;

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
    this.currentUser = selectCurrentUser(state);
    this.isSystemAdmin = selectIsSystemAdmin(state);
  }

  private async handleLogout() {
    await this.store.dispatch(logout());
    window.location.href = '/login';
  }

  private toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  private toggleProfileMenu() {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  private navigate(path: string) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    this.mobileMenuOpen = false;
    this.profileMenuOpen = false;
  }

  render() {
    const currentPath = window.location.pathname;

    return html`
      <nav class="fixed top-0 left-0 right-0 bg-gray-800 z-50">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-16 items-center justify-between">
            <div class="flex items-center">
              <div class="shrink-0">
                <a href="/" class="text-xl font-bold text-white no-underline">IRL</a>
              </div>
              ${this.isAuthenticated
                ? html`
                    <div class="hidden sm:ml-6 sm:block">
                      <div class="flex space-x-4">
                        <a
                          href="/home"
                          @click=${(e: Event) => {
                            e.preventDefault();
                            this.navigate('/home');
                          }}
                          class="rounded-md px-3 py-2 text-sm font-medium ${currentPath === '/home'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'} no-underline"
                        >
                          Home
                        </a>
                        <a
                          href="/persons"
                          @click=${(e: Event) => {
                            e.preventDefault();
                            this.navigate('/persons');
                          }}
                          class="rounded-md px-3 py-2 text-sm font-medium ${currentPath === '/persons' || currentPath === '/persons/create'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'} no-underline"
                        >
                          People
                        </a>
                        <a
                          href="/groups/create"
                          @click=${(e: Event) => {
                            e.preventDefault();
                            this.navigate('/groups/create');
                          }}
                          class="rounded-md px-3 py-2 text-sm font-medium ${currentPath === '/groups/create'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'} no-underline"
                        >
                          Groups
                        </a>
                        ${this.isSystemAdmin
                          ? html`
                              <a
                                href="/admin/system"
                                @click=${(e: Event) => {
                                  e.preventDefault();
                                  this.navigate('/admin/system');
                                }}
                                class="rounded-md px-3 py-2 text-sm font-medium ${currentPath === '/admin/system'
                                  ? 'bg-gray-900 text-white'
                                  : 'text-gray-300 hover:bg-white/5 hover:text-white'} no-underline"
                              >
                                System Admin
                              </a>
                            `
                          : ''}
                      </div>
                    </div>
                  `
                : ''}
            </div>
            ${this.isAuthenticated
              ? html`
                  <div class="hidden sm:ml-6 sm:block">
                    <div class="flex items-center">
                      <!-- Profile dropdown -->
                      <div class="relative ml-3">
                        <button
                          @click=${this.toggleProfileMenu}
                          class="relative flex items-center gap-3 rounded-full bg-gray-800 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                          <span class="sr-only">Open user menu</span>
                          <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                            ${this.currentPerson ? this.currentPerson.firstName[0] : 'U'}
                          </div>
                          ${this.currentPerson
                            ? html`<span class="text-sm text-gray-300"
                                >${this.currentPerson.firstName} ${this.currentPerson.lastName}</span
                              >`
                            : ''}
                        </button>

                        ${this.profileMenuOpen
                          ? html`
                              <div
                                class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5"
                              >
                                ${this.isSystemAdmin
                                  ? html`
                                      <a
                                        href="/admin/system"
                                        @click=${(e: Event) => {
                                          e.preventDefault();
                                          this.navigate('/admin/system');
                                        }}
                                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 no-underline"
                                      >
                                        System Admin
                                      </a>
                                    `
                                  : ''}
                                <button
                                  @click=${this.handleLogout}
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 bg-transparent border-none cursor-pointer"
                                >
                                  Sign out
                                </button>
                              </div>
                            `
                          : ''}
                      </div>
                    </div>
                  </div>
                  <div class="-mr-2 flex sm:hidden">
                    <!-- Mobile menu button -->
                    <button
                      @click=${this.toggleMobileMenu}
                      class="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-500"
                    >
                      <span class="sr-only">Open main menu</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        aria-hidden="true"
                        class="size-6 ${this.mobileMenuOpen ? 'hidden' : 'block'}"
                      >
                        <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        aria-hidden="true"
                        class="size-6 ${this.mobileMenuOpen ? 'block' : 'hidden'}"
                      >
                        <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                  </div>
                `
              : ''}
          </div>
        </div>

        ${this.isAuthenticated && this.mobileMenuOpen
          ? html`
              <div class="sm:hidden">
                <div class="space-y-1 px-2 pt-2 pb-3">
                  <a
                    href="/home"
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.navigate('/home');
                    }}
                    class="block rounded-md px-3 py-2 text-base font-medium ${currentPath === '/home'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'} no-underline"
                  >
                    Home
                  </a>
                  <a
                    href="/persons"
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.navigate('/persons');
                    }}
                    class="block rounded-md px-3 py-2 text-base font-medium ${currentPath === '/persons' || currentPath === '/persons/create'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'} no-underline"
                  >
                    People
                  </a>
                  <a
                    href="/groups/create"
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.navigate('/groups/create');
                    }}
                    class="block rounded-md px-3 py-2 text-base font-medium ${currentPath === '/groups/create'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'} no-underline"
                  >
                    Groups
                  </a>
                  ${this.isSystemAdmin
                    ? html`
                        <a
                          href="/admin/system"
                          @click=${(e: Event) => {
                            e.preventDefault();
                            this.navigate('/admin/system');
                          }}
                          class="block rounded-md px-3 py-2 text-base font-medium ${currentPath === '/admin/system'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'} no-underline"
                        >
                          System Admin
                        </a>
                      `
                    : ''}
                </div>
                <div class="border-t border-gray-700 pt-4 pb-3">
                  <div class="flex items-center px-5">
                    <div class="shrink-0">
                      <div class="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                        ${this.currentPerson ? this.currentPerson.firstName[0] : 'U'}
                      </div>
                    </div>
                    ${this.currentPerson
                      ? html`
                          <div class="ml-3">
                            <div class="text-base font-medium text-white">
                              ${this.currentPerson.firstName} ${this.currentPerson.lastName}
                            </div>
                            <div class="text-sm font-medium text-gray-400">${this.currentUser?.email || ''}</div>
                          </div>
                        `
                      : ''}
                  </div>
                  <div class="mt-3 space-y-1 px-2">
                    <button
                      @click=${this.handleLogout}
                      class="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-white/5 hover:text-white bg-transparent border-none cursor-pointer"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            `
          : ''}
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-navigation': AppNavigation;
  }
}
