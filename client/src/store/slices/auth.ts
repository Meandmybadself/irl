import { normalize } from 'normalizr';
import { authResponseSchema } from '../schemas.js';
import { mergeEntities } from './entities.js';
import type { AppThunk } from '../index.js';

export interface AuthState {
  currentUserId: number | null;
  currentPersonId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  attemptedPath: string | null;
}

const initialState: AuthState = {
  currentUserId: null,
  currentPersonId: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  attemptedPath: null
};

// Action types
const AUTH_REQUEST = 'auth/request';
const AUTH_SUCCESS = 'auth/success';
const AUTH_FAILURE = 'auth/failure';
const AUTH_LOGOUT = 'auth/logout';
const AUTH_SET_ATTEMPTED_PATH = 'auth/setAttemptedPath';

// Action creators
const authRequest = () => ({ type: AUTH_REQUEST });
const authSuccess = (userId: number, personId: number | null) => ({
  type: AUTH_SUCCESS,
  payload: { userId, personId }
});
const authFailure = (error: string) => ({
  type: AUTH_FAILURE,
  payload: error
});
const authLogout = () => ({ type: AUTH_LOGOUT });

export const setAttemptedPath = (path: string | null) => ({
  type: AUTH_SET_ATTEMPTED_PATH,
  payload: path
});

// Thunks
export const login = (email: string, password: string): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    dispatch(authRequest());
    try {
      const response = await apiClient.login(email, password);
      if (!response.data) throw new Error('No data returned from login');

      const normalized = normalize(response.data, authResponseSchema);

      dispatch(mergeEntities(normalized.entities));
      if (response.data.person) {
        dispatch(authSuccess(response.data.user.id, response.data.person.id));
      } else {
        dispatch(authSuccess(response.data.user.id, null));
      }
    } catch (error) {
      dispatch(authFailure(error instanceof Error ? error.message : 'Login failed'));
      throw error;
    }
  };
};

export const register = (email: string, password: string): AppThunk<Promise<{ message: string }>> => {
  return async (dispatch, _getState, { apiClient }) => {
    dispatch(authRequest());
    try {
      const response = await apiClient.createUser({ email, password });
      // Don't set auth state on register - user needs to verify email first
      dispatch({ type: 'auth/registerSuccess' });
      return { message: response.message || 'User created successfully' };
    } catch (error) {
      dispatch(authFailure(error instanceof Error ? error.message : 'Registration failed'));
      throw error;
    }
  };
};

export const checkSession = (): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    dispatch(authRequest());
    try {
      const response = await apiClient.getCurrentSession();
      if (!response.data) throw new Error('No data returned from session check');

      const normalized = normalize(response.data, authResponseSchema);

      dispatch(mergeEntities(normalized.entities));
      
      if (response.data.person) {
        dispatch(authSuccess(response.data.user.id, response.data.person.id));
      } else {
        dispatch(authSuccess(response.data.user.id, null));
      }
    } catch (error) {
      // Session check failure is expected when not logged in
      dispatch({ type: 'auth/sessionCheckComplete' });
    }
  };
};

export const logout = (): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    try {
      await apiClient.logout();
    } catch (error) {
      // Logout errors are not critical
      console.error('Logout error:', error);
    } finally {
      dispatch(authLogout());
    }
  };
};

export const resendVerification = (email: string): AppThunk => {
  return async (_dispatch, _getState, { apiClient }) => {
    try {
      await apiClient.resendVerification(email);
    } catch (error) {
      throw error;
    }
  };
};

export const verifyEmail = (token: string): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    dispatch(authRequest());
    try {
      await apiClient.verifyUser(token);
      dispatch({ type: 'auth/verifySuccess' });
    } catch (error) {
      dispatch(authFailure(error instanceof Error ? error.message : 'Verification failed'));
      throw error;
    }
  };
};

// Reducer
export const authReducer = (
  state = initialState,
  action: { type: string; payload?: any }
): AuthState => {
  switch (action.type) {
    case AUTH_REQUEST:
      return { ...state, isLoading: true, error: null };
    case AUTH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        currentUserId: action.payload.userId,
        currentPersonId: action.payload.personId,
        error: null
      };
    case AUTH_FAILURE:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload
      };
    case AUTH_LOGOUT:
      return {
        ...initialState
      };
    case 'auth/sessionCheckComplete':
      return { ...state, isLoading: false };
    case 'auth/registerSuccess':
      return { ...state, isLoading: false, error: null };
    case 'auth/verifySuccess':
      return { ...state, isLoading: false, error: null };
    case AUTH_SET_ATTEMPTED_PATH:
      return { ...state, attemptedPath: action.payload };
    default:
      return state;
  }
};
