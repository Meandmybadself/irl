export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface UIState {
  notifications: Notification[];
}

const initialState: UIState = {
  notifications: []
};

// Action types
const ADD_NOTIFICATION = 'ui/addNotification';
const REMOVE_NOTIFICATION = 'ui/removeNotification';

// Action creators
export const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => ({
  type: ADD_NOTIFICATION,
  payload: {
    id: Date.now().toString(),
    message,
    type
  }
});

export const removeNotification = (id: string) => ({
  type: REMOVE_NOTIFICATION,
  payload: id
});

// Reducer
export const uiReducer = (
  state = initialState,
  action: { type: string; payload?: any }
): UIState => {
  switch (action.type) {
    case ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    default:
      return state;
  }
};
