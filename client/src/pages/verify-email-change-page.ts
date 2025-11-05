import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { addNotification } from '../store/slices/ui.js';
import { apiClient } from '../services/api-client.js';
import type { AppStore } from '../store/index.js';
import '../components/ui/button.js';

@customElement('verify-email-change-page')
export class VerifyEmailChangePage extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @state()
  private isVerifying = false;

  @state()
  private verificationSuccess = false;

  connectedCallback() {
    super.connectedCallback();

    // Check for verification token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      this.handleVerification(token);
    }
  }

  private async handleVerification(token: string) {
    this.isVerifying = true;
    try {
      await apiClient.verifyEmailChange(token);
      this.verificationSuccess = true;
      this.store.dispatch(addNotification('Email address updated successfully!', 'success'));

      // Redirect to profile after 2 seconds using client-side navigation
      setTimeout(() => {
        window.history.pushState({}, '', '/profile');
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

  render() {
    if (this.isVerifying) {
      return html`
        <div class="block min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-6 pt-16 px-4">
          <div class="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm text-center">
            <div class="text-6xl mb-4">⏳</div>
            <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Verifying Email...</h1>
            <p class="text-base text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Please wait while we verify your new email address.
            </p>
          </div>
        </div>
      `;
    }

    if (this.verificationSuccess) {
      return html`
        <div class="block min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-6 pt-16 px-4">
          <div class="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm text-center">
            <div class="text-6xl mb-4">✅</div>
            <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Email Updated!</h1>
            <p class="text-green-600 dark:text-green-400 font-semibold mb-4">
              Your email address has been updated successfully.
            </p>
            <p class="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              Redirecting you to your profile...
            </p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="block min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-6 pt-16 px-4">
        <div class="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm text-center">
          <div class="text-6xl mb-4">❌</div>
          <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Verification Failed</h1>
          <p class="text-base text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            The verification link is invalid or has expired. Please request a new email change from your profile.
          </p>

          <div class="mt-6">
            <a
              href="/profile"
              class="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 no-underline"
            >
              Go to Profile
            </a>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'verify-email-change-page': VerifyEmailChangePage;
  }
}

