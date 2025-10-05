import { LitElement, html, css } from 'lit';
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
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9fafb;
      padding: 1rem;
    }

    .container {
      width: 100%;
      max-width: 28rem;
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      text-align: center;
      margin: 0 0 2rem 0;
      color: #111827;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .footer a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
    }

    .footer a:hover {
      text-decoration: underline;
    }
  `;

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
      <div class="container">
        <h1>Create Account</h1>
        <form @submit=${this.handleSubmit}>
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

        <div class="footer">
          Already have an account? <a href="/login">Sign in</a>
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
