import { Map } from 'immutable';
import * as types from '../../actions/windows/types';

const initialState = {
  windows: Map()
};

export default function windows(state = initialState, action) {
  switch (action.type) {
    case types.ADD_WINDOW_SERVER: {
      return Object.assign({}, state, {
        foo: true
      });
    }
    default:
      return state;
  }
}
