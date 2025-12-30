import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { textColors, backgroundColors } from '../../utilities/text-colors.js';

interface AdminNavItem {
  path: string;
  label: string;
}

@customElement('admin-nav')
export class AdminNav extends LitElement {
  createRenderRoot() {
    return this;
  }

  @property({ type: String })
  currentPath = '';

  private navItems: AdminNavItem[] = [
    { path: '/admin/system', label: 'System' },
    { path: '/admin/categories', label: 'Categories' },
    { path: '/admin/users', label: 'Users' },
    { path: '/admin/logs', label: 'Audit Logs' },
  ];

  private handleNavClick(e: Event, path: string) {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  render() {
    return html`
      <div class="mb-6">
        <h2 class="text-2xl/9 font-bold tracking-tight ${textColors.primary} mb-4">
          Administration
        </h2>

        <nav class="flex border-b ${backgroundColors.border}">
          ${this.navItems.map(
            item => html`
              <a
                href="${item.path}"
                @click=${(e: Event) => this.handleNavClick(e, item.path)}
                class="${this.currentPath === item.path
                  ? `border-b-2 border-indigo-600 ${textColors.primary}`
                  : `border-b-2 border-transparent ${textColors.secondary} hover:${textColors.primary} hover:border-gray-300`}
                  px-4 py-2 text-sm font-medium transition-colors"
              >
                ${item.label}
              </a>
            `
          )}
        </nav>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-nav': AdminNav;
  }
}
