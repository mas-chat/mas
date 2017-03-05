import { Map } from 'immutable';
import * as types from '../../actions/users/types';

const initialState = {
  users: new Map()
};

export default function usersReducer(state = initialState, action) {
  switch (action.type) {
    case types.SERVER_ADD_USERS: {
      const mapping = action.data.mapping;

      return {
        users: Object.entries(mapping).reduce(
          (currentUsers, [ userId, details ]) => currentUsers.set(userId, details), state.users)
      };
    }
    default:
      return state;
  }
}
