import type { AppThunk } from '../index.js';
import type { ApiClient } from '../../services/api-client.js';
import { mergeEntities } from './entities.js';
import { normalize } from 'normalizr';
import { systemSchema } from '../schemas.js';

// Action types
const SYSTEM_REQUEST = 'system/request';
const SYSTEM_SUCCESS = 'system/success';
const SYSTEM_FAILURE = 'system/failure';

// Action creators
const systemRequest = () => ({
  type: SYSTEM_REQUEST
});

const systemSuccess = (system: any) => ({
  type: SYSTEM_SUCCESS,
  payload: system
});

const systemFailure = (error: string) => ({
  type: SYSTEM_FAILURE,
  payload: error
});

// Thunk action to load system data
export const loadSystem = (): AppThunk => {
  return async (dispatch, _getState, { apiClient }: { apiClient: ApiClient }) => {
    dispatch(systemRequest());
    
    try {
      const response = await apiClient.getSystem();
      if (response.success && response.data) {
        const normalized = normalize(response.data, systemSchema);
        dispatch(mergeEntities(normalized.entities));
        dispatch(systemSuccess(response.data));
      } else {
        dispatch(systemFailure('Failed to load system data'));
      }
    } catch (error) {
      // System might not exist yet, which is OK
      dispatch(systemFailure('System not configured'));
    }
  };
};

// Initial state
export interface SystemState {
  isLoading: boolean;
  error: string | null;
}

const initialState: SystemState = {
  isLoading: false,
  error: null
};

// Reducer
export const systemReducer = (
  state = initialState,
  action: { type: string; payload?: any }
): SystemState => {
  switch (action.type) {
    case SYSTEM_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case SYSTEM_SUCCESS:
      return {
        ...state,
        isLoading: false,
        error: null
      };
    case SYSTEM_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };
    default:
      return state;
  }
};
