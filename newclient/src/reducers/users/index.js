import { Map } from 'immutable';
import * as types from '../../actions/users/types';

const initialState = {
  users: Map() // eslint-disable-line new-cap
};

export default function users(state = initialState, action) {
  switch (action.type) {
    case types.ADD_USERS_SERVER: {
      for (const [ userId, details ] of Object.entries(action.data.mapping)) {
        state.users.set(userId, details);
      }

      return state;
    }
    default:
      return state;
  }
}
