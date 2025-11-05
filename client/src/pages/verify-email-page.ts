import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { verifyEmail, resendVerification } from '../store/slices/auth.js';
import { addNotification } from '../store/slices/ui.js';
import type { AppStore } from '../store/index.js';
import '../components/ui/button.js';

@customElement('verify-email-page')
export class VerifyEmailPage extends LitElement {
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
  private isResending = false;

  @state()
  private isVerifying = false;

  @state()
  private verificationSuccess = false;

  connectedCallback() {
    super.connectedCallback();

    // Get email from URL params
    const params = new URLSearchParams(window.location.search);
    this.email = params.get('email') || '';

    // Check for verification token in URL
    const token = params.get('token');
    if (token) {
      this.handleVerification(token);
    }
  }

  private async handleVerification(token: string) {
    this.isVerifying = true;
    try {
      await this.store.dispatch(verifyEmail(token));
      this.verificationSuccess = true;
      this.store.dispatch(addNotification('Email verified successfully! You can now sign in.', 'success'));

      // Redirect to login after 2 seconds using client-side navigation
      setTimeout(() => {
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 2000);
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Verification failed. Please try again.',
          'error'
        )
      );
    } finally {
      this.isVerifying = false;
    }
  }

  private async handleResend() {
    if (!this.email) {
      this.store.dispatch(addNotification('Email address not found. Please register again.', 'error'));
      return;
    }

    this.isResending = true;
    try {
      await this.store.dispatch(resendVerification(this.email));
      this.store.dispatch(addNotification('Verification email sent!', 'success'));
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to resend verification email.',
          'error'
        )
      );
    } finally {
      this.isResending = false;
    }
  }

  render() {
    if (this.isVerifying) {
      return html`
        <div class="block min-h-screen flex items-center justify-center bg-gray-50 py-6 pt-16 px-4">
          <div class="w-full max-w-md bg-white p-8 rounded-lg shadow-sm text-center">
            <div class="text-6xl mb-4">⏳</div>
            <h1 class="text-3xl font-bold mb-4 text-gray-900">Verifying Email...</h1>
            <p class="text-base text-gray-600 mb-6 leading-relaxed">Please wait while we verify your email address.</p>
          </div>
        </div>
      `;
    }

    if (this.verificationSuccess) {
      return html`
        <div class="block min-h-screen flex items-center justify-center bg-gray-50 py-6 pt-16 px-4">
          <div class="w-full max-w-md bg-white p-8 rounded-lg shadow-sm text-center">
            <div class="text-6xl mb-4">✅</div>
            <h1 class="text-3xl font-bold mb-4 text-gray-900">Email Verified!</h1>
            <p class="text-green-600 font-semibold mb-4">Your email has been verified successfully.</p>
            <p class="text-base text-gray-600 leading-relaxed">Redirecting you to sign in...</p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="block min-h-screen flex items-center justify-center bg-gray-50 py-6 pt-16 px-4">
        <div class="w-full max-w-md bg-white p-8 rounded-lg shadow-sm text-center">
          <div class="text-6xl mb-4">📧</div>
          <h1 class="text-3xl font-bold mb-4 text-gray-900">Verify Your Email</h1>
          <p class="text-base text-gray-600 mb-6 leading-relaxed">
            We've sent a verification email to
            ${this.email ? html`<span class="font-semibold text-gray-900">${this.email}</span>` : 'your email address'}.
            Please check your inbox and click the verification link to activate your account.
          </p>

          <div class="flex flex-col gap-4 mt-8">
            <ui-button
              variant="outline"
              ?loading=${this.isResending}
              @click=${this.handleResend}
            >
              Resend Verification Email
            </ui-button>
          </div>

          <div class="mt-6 text-sm text-gray-600">
            Need help? <a href="mailto:support@example.com" class="text-blue-500 no-underline font-medium hover:underline">Contact Support</a>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'verify-email-page': VerifyEmailPage;
  }
}
