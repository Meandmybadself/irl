import { createContext } from '@lit-labs/context';
import type { ApiClient } from '../services/api-client.js';

export const apiContext = createContext<ApiClient>('api');
