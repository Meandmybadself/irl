import type { User, Person, Group, ContactInformation, System } from '@irl/shared';

export interface EntitiesState {
  users: Record<number, User>;
  persons: Record<number, Person>;
  groups: Record<number, Group>;
  contactInformation: Record<number, ContactInformation>;
  system: Record<number, System>;
}

const initialState: EntitiesState = {
  users: {},
  persons: {},
  groups: {},
  contactInformation: {},
  system: {}
};

// Action types
const MERGE_ENTITIES = 'entities/merge';

// Action creators
export const mergeEntities = (entities: Partial<EntitiesState>) => ({
  type: MERGE_ENTITIES,
  payload: entities
});

// Reducer
export const entitiesReducer = (
  state = initialState,
  action: { type: string; payload?: Partial<EntitiesState> }
): EntitiesState => {
  switch (action.type) {
    case MERGE_ENTITIES:
      return {
        users: { ...state.users, ...action.payload?.users },
        persons: { ...state.persons, ...action.payload?.persons },
        groups: { ...state.groups, ...action.payload?.groups },
        contactInformation: { ...state.contactInformation, ...action.payload?.contactInformation },
        system: { ...state.system, ...action.payload?.system }
      };
    default:
      return state;
  }
};
