import { Map } from 'immutable';
import * as types from '../../actions/users/types';

const initialState = {
  users: Map() // eslint-disable-line new-cap
};

export default function users(state = initialState, action) {
  switch (action.type) {
    case types.ADD_USERS_SERVER: {
      const mapping = action.data.mapping;

      return {
        users: Object.entries(mapping).reduce(
          (state, [ userId, details]) => state.set(userId, details), state.users)
      }
    }
    default:
      return state;
  }
}
