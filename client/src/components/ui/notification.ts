import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../../contexts/store-context.js';
import { removeNotification } from '../../store/slices/ui.js';
import { selectNotifications } from '../../store/selectors.js';
import type { AppStore } from '../../store/index.js';

@customElement('ui-notifications')
export class UINotifications extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

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

  private getNotificationClasses(type: string) {
    const baseClasses = 'mb-3 p-4 rounded-lg shadow-lg flex items-start justify-between gap-3 animate-slide-in';

    const typeClasses = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800'
    };

    return `${baseClasses} ${typeClasses[type as keyof typeof typeClasses] || typeClasses.info}`;
  }

  render() {
    return html`
      <div class="fixed top-4 right-4 z-[9999] max-w-sm">
        ${this.notifications.map(
          notification => html`
            <div class=${this.getNotificationClasses(notification.type)}>
              <div class="flex-1 text-sm">${notification.message}</div>
              <button
                class="bg-transparent border-none cursor-pointer p-0 text-xl leading-none opacity-60 hover:opacity-100 transition-opacity"
                @click=${() => this.handleClose(notification.id)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-notifications': UINotifications;
  }
}
