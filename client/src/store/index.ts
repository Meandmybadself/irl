import { createStore, combineReducers, applyMiddleware, type AnyAction, type Store } from 'redux';
import thunk, { type ThunkAction, type ThunkDispatch } from 'redux-thunk';
import type { ApiClient } from '../services/api-client.js';
import { entitiesReducer } from './slices/entities.js';
import { authReducer } from './slices/auth.js';
import { uiReducer } from './slices/ui.js';

// Root reducer
const rootReducer = combineReducers({
  entities: entitiesReducer,
  auth: authReducer,
  ui: uiReducer
});

export type RootState = ReturnType<typeof rootReducer>;

// Thunk extra argument
interface ThunkExtraArgument {
  apiClient: ApiClient;
}

// Thunk types
export type AppThunk<ReturnType = Promise<void>> = ThunkAction<
  ReturnType,
  RootState,
  ThunkExtraArgument,
  AnyAction
>;

export type AppDispatch = ThunkDispatch<RootState, ThunkExtraArgument, AnyAction>;

// Custom store type with enhanced dispatch
export interface AppStore extends Store<RootState, AnyAction> {
  dispatch: AppDispatch;
}

// Store factory
export const createAppStore = (apiClient: ApiClient): AppStore => {
  const thunkWithExtra = thunk.withExtraArgument({ apiClient });
  return createStore(
    rootReducer,
    applyMiddleware(thunkWithExtra)
  ) as AppStore;
};
