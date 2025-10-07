import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { register } from '../store/slices/auth.js';
import { addNotification } from '../store/slices/ui.js';
import { validateEmail, validatePassword } from '../utilities/validation.js';
import type { AppStore } from '../store/index.js';
import '../components/ui/input.js';
import '../components/ui/button.js';

@customElement('register-page')
export class RegisterPage extends LitElement {
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

  private handleInputChange(e: CustomEvent) {
    const { name, value } = e.detail;
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
    this.passwordError = validatePassword(this.password) || '';

    if (this.emailError || this.passwordError) {
      return;
    }

    this.isLoading = true;

    try {
      await this.store.dispatch(register(this.email, this.password));
      this.store.dispatch(addNotification('Registration successful! Please check your email to verify your account.', 'success'));
      // Navigate to verify email page using client-side navigation
      const targetPath = '/verify-email?email=' + encodeURIComponent(this.email);
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Registration failed. Please try again.',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  render() {
    return html`
      <div class="block min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div class="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
          <h1 class="text-3xl font-bold text-center mb-8 text-gray-900">Create Account</h1>
          <form @submit=${this.handleSubmit} class="flex flex-col gap-6">
            <ui-input
              label="Email"
              name="email"
              type="email"
              .value=${this.email}
              .error=${this.emailError}
              placeholder="you@example.com"
              autocomplete="email"
              required
              autofocus
              @input-change=${this.handleInputChange}
            ></ui-input>

            <ui-input
              label="Password (at least 8 characters)"
              name="password"
              type="password"
              .value=${this.password}
              .error=${this.passwordError}
              placeholder="••••••••"
              autocomplete="new-password"
              required
              @input-change=${this.handleInputChange}
            ></ui-input>

            <ui-button type="submit" variant="primary" ?loading=${this.isLoading}>
              Create Account
            </ui-button>
          </form>

          <div class="mt-6 text-center text-sm text-gray-600">
            Already have an account? <a href="/login" class="text-blue-500 no-underline font-medium hover:underline">Sign in</a>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'register-page': RegisterPage;
  }
}
