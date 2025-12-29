import type { AnyAction } from 'redux';
import type { AppThunk } from '../index.js';

export interface MasqueradeState {
  isMasquerading: boolean;
  originalUserEmail: string | null;
  masqueradeUserEmail: string | null;
}

const initialState: MasqueradeState = {
  isMasquerading: false,
  originalUserEmail: null,
  masqueradeUserEmail: null,
};

// Action types
const SET_MASQUERADE = 'masquerade/setMasquerade';
const CLEAR_MASQUERADE = 'masquerade/clearMasquerade';

// Action creators
export const setMasquerade = (payload: { originalUserEmail: string; masqueradeUserEmail: string }) => ({
  type: SET_MASQUERADE,
  payload
});

export const clearMasquerade = () => ({
  type: CLEAR_MASQUERADE
});

// Thunk to check masquerade status
export const checkMasqueradeStatus = (): AppThunk => async (dispatch, _getState, { apiClient }) => {
  try {
    const response = await apiClient.getMasqueradeStatus();

    if (response.success && response.data?.isMasquerading && response.data?.masqueradeInfo) {
      dispatch(setMasquerade({
        originalUserEmail: response.data.masqueradeInfo.originalUserEmail,
        masqueradeUserEmail: response.data.masqueradeInfo.masqueradeUserEmail
      }));
    } else {
      dispatch(clearMasquerade());
    }
  } catch (error) {
    // Silently fail - not critical
    console.error('Failed to check masquerade status:', error);
  }
};

// Reducer
export default function masqueradeReducer(
  state: MasqueradeState = initialState,
  action: AnyAction
): MasqueradeState {
  switch (action.type) {
    case SET_MASQUERADE:
      return {
        ...state,
        isMasquerading: true,
        originalUserEmail: action.payload.originalUserEmail,
        masqueradeUserEmail: action.payload.masqueradeUserEmail
      };
    case CLEAR_MASQUERADE:
      return {
        ...state,
        isMasquerading: false,
        originalUserEmail: null,
        masqueradeUserEmail: null
      };
    default:
      return state;
  }
}
