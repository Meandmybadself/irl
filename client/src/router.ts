import { html, type TemplateResult } from 'lit';
import type { AppStore } from './store/index.js';
import { selectIsAuthenticated } from './store/selectors.js';
import { setAttemptedPath } from './store/slices/auth.js';

// Import pages
import './pages/register-page.js';
import './pages/login-page.js';
import './pages/verify-email-page.js';
import './pages/home-page.js';

export interface RouteConfig {
  path: string;
  render: () => TemplateResult;
}

export const createRoutes = (store: AppStore): RouteConfig[] => {
  // Route guard: checks if user is authenticated
  const requireAuth = (path: string): boolean => {
    const state = store.getState();
    const isAuthenticated = selectIsAuthenticated(state);

    if (!isAuthenticated) {
      // Store attempted path for redirect after login
      store.dispatch(setAttemptedPath(path));
      // Redirect to login
      window.location.href = '/login';
      return false;
    }

    return true;
  };

  // Route guard: redirects authenticated users away from auth pages
  const redirectIfAuthenticated = (): boolean => {
    const state = store.getState();
    const isAuthenticated = selectIsAuthenticated(state);

    if (isAuthenticated) {
      window.location.href = '/home';
      return false;
    }

    return true;
  };

  return [
    {
      path: '/',
      render: () => {
        // Redirect root to home if authenticated, otherwise to login
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);
        window.location.href = isAuthenticated ? '/home' : '/login';
        return html``;
      }
    },
    {
      path: '/register',
      render: () => {
        if (!redirectIfAuthenticated()) return html``;
        return html`<register-page></register-page>`;
      }
    },
    {
      path: '/login',
      render: () => {
        if (!redirectIfAuthenticated()) return html``;
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
        if (!requireAuth('/home')) return html``;
        return html`<home-page></home-page>`;
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
