// Import URLPattern polyfill for Safari compatibility
import 'urlpattern-polyfill';

import './app.js';

// Bootstrap the application
const app = document.createElement('app-root');
document.body.appendChild(app);

// Export API client for external use if needed
export { ApiClient, apiClient } from './services/api-client.js';
export type { PaginationParams } from './services/api-client.js';