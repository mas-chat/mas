import { Map } from 'immutable';
import { ADD_USERS } from '../../actions/users/types';

const initialState = {
  users: new Map()
};

export default function usersReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_USERS: {
      const mapping = action.mapping;

      return {
        users: Object.entries(mapping).reduce(
          (currentUsers, [ userId, details ]) => currentUsers.set(userId, details), state.users)
      };
    }
    default:
      return state;
  }
}
