import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { login } from '../store/slices/auth.js';
import { addNotification } from '../store/slices/ui.js';
import { selectAttemptedPath, selectSystemName, selectSystemDescription } from '../store/selectors.js';
import { validateEmail } from '../utilities/validation.js';
import type { AppStore } from '../store/index.js';
import '../components/ui/input.js';
import '../components/ui/button.js';

@customElement('login-page')
export class LoginPage extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @state()
  private email = '';

  @state()
  private password = '';

  @state()
  private emailError = '';

  @state()
  private passwordError = '';

  @state()
  private isLoading = false;

  private get systemName(): string | null {
    return selectSystemName(this.store.getState());
  }

  private get systemDescription(): string | null {
    return selectSystemDescription(this.store.getState());
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;
    if (name === 'email') {
      this.email = value;
      this.emailError = '';
    } else if (name === 'password') {
      this.password = value;
      this.passwordError = '';
    }
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    // Validate
    this.emailError = validateEmail(this.email) || '';
    if (!this.password) {
      this.passwordError = 'Password is required';
    }

    if (this.emailError || this.passwordError) {
      return;
    }

    this.isLoading = true;

    try {
      await this.store.dispatch(login(this.email, this.password));
      this.store.dispatch(addNotification('Welcome back!', 'success'));

      // Redirect to attempted path or home using client-side navigation
      const attemptedPath = selectAttemptedPath(this.store.getState());
      const targetPath = attemptedPath || '/home';
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Login failed. Please check your credentials.',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  render() {
    return html`
      <div class="flex min-h-full flex-col justify-center py-6 sm:px-6 lg:px-8 pt-16">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
          ${this.systemName ? html`
            <h1 class="text-center text-3xl/10 font-bold tracking-tight text-gray-900 mb-2">
              ${this.systemName}
            </h1>
          ` : ''}
          ${this.systemDescription ? html`
            <p class="text-center text-sm text-gray-600 mb-4">
              ${this.systemDescription}
            </p>
          ` : ''}
          <h2 class="mt-6 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div class="bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
            <form @submit=${this.handleSubmit} class="space-y-6">
              <div>
                <label for="email" class="block text-sm/6 font-medium text-gray-900">
                  Email address
                </label>
                <div class="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    .value=${this.email}
                    required
                    autocomplete="email"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.emailError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  ${this.emailError ? html`<p class="mt-1 text-sm text-red-600">${this.emailError}</p>` : ''}
                </div>
              </div>

              <div>
                <label for="password" class="block text-sm/6 font-medium text-gray-900">
                  Password
                </label>
                <div class="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    .value=${this.password}
                    required
                    autocomplete="current-password"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.passwordError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  ${this.passwordError ? html`<p class="mt-1 text-sm text-red-600">${this.passwordError}</p>` : ''}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  ?disabled=${this.isLoading}
                  class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${this.isLoading
                    ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                    : ''}
                  Sign in
                </button>
              </div>
            </form>

            <div>
              <div class="mt-10 flex items-center gap-x-6">
                <div class="w-full flex-1 border-t border-gray-200"></div>
                <p class="text-sm/6 font-medium text-nowrap text-gray-900">Or</p>
                <div class="w-full flex-1 border-t border-gray-200"></div>
              </div>

              <div class="mt-6">
                <a
                  href="/register"
                  class="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 no-underline"
                >
                  Create new account
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'login-page': LoginPage;
  }
}
