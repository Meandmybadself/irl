import { createContext } from '@lit-labs/context';
import type { AppStore } from '../store/index.js';

export const storeContext = createContext<AppStore>('store');
