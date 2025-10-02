import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { verifyEmail, resendVerification } from '../store/slices/auth.js';
import { addNotification } from '../store/slices/ui.js';
import type { AppStore } from '../store/index.js';
import '../components/ui/button.js';

@customElement('verify-email-page')
export class VerifyEmailPage extends LitElement {
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
      text-align: center;
    }

    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      margin: 0 0 1rem 0;
      color: #111827;
    }

    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .message {
      font-size: 1rem;
      color: #6b7280;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }

    .email {
      font-weight: 600;
      color: #111827;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 2rem;
    }

    .footer {
      margin-top: 1.5rem;
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

    .success {
      color: #059669;
      font-weight: 600;
      margin-bottom: 1rem;
    }
  `;

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

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
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
        <div class="container">
          <div class="icon">⏳</div>
          <h1>Verifying Email...</h1>
          <p class="message">Please wait while we verify your email address.</p>
        </div>
      `;
    }

    if (this.verificationSuccess) {
      return html`
        <div class="container">
          <div class="icon">✅</div>
          <h1>Email Verified!</h1>
          <p class="success">Your email has been verified successfully.</p>
          <p class="message">Redirecting you to sign in...</p>
        </div>
      `;
    }

    return html`
      <div class="container">
        <div class="icon">📧</div>
        <h1>Verify Your Email</h1>
        <p class="message">
          We've sent a verification email to
          ${this.email ? html`<span class="email">${this.email}</span>` : 'your email address'}.
          Please check your inbox and click the verification link to activate your account.
        </p>

        <div class="actions">
          <ui-button
            variant="outline"
            ?loading=${this.isResending}
            @click=${this.handleResend}
          >
            Resend Verification Email
          </ui-button>
        </div>

        <div class="footer">
          Need help? <a href="mailto:support@example.com">Contact Support</a>
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
