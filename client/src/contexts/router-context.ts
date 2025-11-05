import { createContext } from '@lit-labs/context';

export interface NavigationContext {
  navigate: (path: string) => void;
}

export const routerContext = createContext<NavigationContext>(Symbol('router-context'));

