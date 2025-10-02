import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../../contexts/store-context.js';
import { removeNotification } from '../../store/slices/ui.js';
import { selectNotifications } from '../../store/selectors.js';
import type { AppStore } from '../../store/index.js';

@customElement('ui-notifications')
export class UINotifications extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      max-width: 24rem;
    }

    .notification {
      margin-bottom: 0.75rem;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 0.75rem;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .notification.success {
      background-color: #d1fae5;
      color: #065f46;
    }

    .notification.error {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .notification.info {
      background-color: #dbeafe;
      color: #1e40af;
    }

    .message {
      flex: 1;
      font-size: 0.875rem;
    }

    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font-size: 1.25rem;
      line-height: 1;
      color: currentColor;
      opacity: 0.6;
      transition: opacity 0.15s;
    }

    .close-button:hover {
      opacity: 1;
    }
  `;

  @consume({ context: storeContext, subscribe: true })
  @state()
  private store!: AppStore;

  @state()
  private notifications: ReturnType<typeof selectNotifications> = [];

  private unsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this.updateNotifications();
      this.unsubscribe = this.store.subscribe(() => {
        this.updateNotifications();
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private updateNotifications() {
    this.notifications = selectNotifications(this.store.getState());

    // Auto-dismiss after 5 seconds
    this.notifications.forEach(notification => {
      setTimeout(() => {
        this.store.dispatch(removeNotification(notification.id));
      }, 5000);
    });
  }

  private handleClose(id: string) {
    this.store.dispatch(removeNotification(id));
  }

  render() {
    return html`
      ${this.notifications.map(
        notification => html`
          <div class="notification ${notification.type}">
            <div class="message">${notification.message}</div>
            <button
              class="close-button"
              @click=${() => this.handleClose(notification.id)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-notifications': UINotifications;
  }
}
