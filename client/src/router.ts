import { html, type TemplateResult } from 'lit';
import type { AppStore } from './store/index.js';
import { selectIsAuthenticated } from './store/selectors.js';
import { setAttemptedPath } from './store/slices/auth.js';

// Import pages
import './pages/register-page.js';
import './pages/login-page.js';
import './pages/verify-email-page.js';
import './pages/home-page.js';
import './pages/system-admin-page.js';
import './pages/create-person-page.js';
import './pages/persons-page.js';

export interface RouteConfig {
  path: string;
  render: () => TemplateResult;
}

export const createRoutes = (store: AppStore): RouteConfig[] => {
  return [
    {
      path: '/',
      render: () => {
        // Render login or home based on auth status
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (isAuthenticated) {
          return html`<home-page></home-page>`;
        }
        return html`<login-page></login-page>`;
      }
    },
    {
      path: '/register',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (isAuthenticated) {
          return html`<home-page></home-page>`;
        }
        return html`<register-page></register-page>`;
      }
    },
    {
      path: '/login',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (isAuthenticated) {
          return html`<home-page></home-page>`;
        }
        return html`<login-page></login-page>`;
      }
    },
    {
      path: '/verify-email',
      render: () => {
        return html`<verify-email-page></verify-email-page>`;
      }
    },
    {
      path: '/home',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          // Store attempted path for redirect after login
          store.dispatch(setAttemptedPath('/home'));
          return html`<login-page></login-page>`;
        }
        return html`<home-page></home-page>`;
      }
    },
    {
      path: '/admin/system',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/admin/system'));
          return html`<login-page></login-page>`;
        }
        return html`<system-admin-page></system-admin-page>`;
      }
    },
    {
      path: '/persons',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/persons'));
          return html`<login-page></login-page>`;
        }
        return html`<persons-page></persons-page>`;
      }
    },
    {
      path: '/persons/create',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/persons/create'));
          return html`<login-page></login-page>`;
        }
        return html`<create-person-page></create-person-page>`;
      }
    },
    {
      path: '/*',
      render: () => {
        return html`
          <div style="padding: 2rem; text-align: center;">
            <h1>404 - Page Not Found</h1>
            <p><a href="/">Go Home</a></p>
          </div>
        `;
      }
    }
  ];
};
