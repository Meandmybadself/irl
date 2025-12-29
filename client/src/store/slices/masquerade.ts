import type { AnyAction } from 'redux';

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
