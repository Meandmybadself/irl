import { createSelector } from 'reselect';
import type { RootState } from './index.js';

// Base selectors
const selectAuth = (state: RootState) => state.auth;
const selectEntities = (state: RootState) => state.entities;
const selectUI = (state: RootState) => state.ui;

// Auth selectors
export const selectIsAuthenticated = createSelector(
  [selectAuth],
  auth => auth.isAuthenticated
);

export const selectIsAuthLoading = createSelector(
  [selectAuth],
  auth => auth.isLoading
);

export const selectAuthError = createSelector(
  [selectAuth],
  auth => auth.error
);

export const selectAttemptedPath = createSelector(
  [selectAuth],
  auth => auth.attemptedPath
);

export const selectCurrentUserId = createSelector(
  [selectAuth],
  auth => auth.currentUserId
);

export const selectCurrentPersonId = createSelector(
  [selectAuth],
  auth => auth.currentPersonId
);

// Entity selectors
export const selectCurrentUser = createSelector(
  [selectEntities, selectCurrentUserId],
  (entities, userId) => (userId ? entities.users[userId] : null)
);

export const selectCurrentPerson = createSelector(
  [selectEntities, selectCurrentPersonId],
  (entities, personId) => (personId ? entities.persons[personId] : null)
);

export const selectAllUserPersons = createSelector(
  [selectEntities, selectCurrentUserId],
  (entities, userId) => {
    if (!userId) return [];
    return Object.values(entities.persons).filter(person => person.userId === userId);
  }
);

// Combined selectors
export const selectIsSystemAdmin = createSelector(
  [selectCurrentUser],
  user => user?.isSystemAdmin ?? false
);

// System selectors
export const selectSystem = createSelector(
  [selectEntities],
  entities => {
    const systemId = 1; // System is always ID 1
    return entities.system[systemId] || null;
  }
);

export const selectSystemName = createSelector(
  [selectSystem],
  system => system?.name || null
);

export const selectSystemDescription = createSelector(
  [selectSystem],
  system => system?.description || null
);

export const selectRegistrationOpen = createSelector(
  [selectSystem],
  system => system?.registrationOpen ?? false
);

// UI selectors
export const selectNotifications = createSelector(
  [selectUI],
  ui => ui.notifications
);
