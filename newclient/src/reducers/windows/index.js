import { Map } from 'immutable';
import * as types from '../../actions/windows/types';

const initialState = {
  windows: new Map()
};

export default function windowsReducer(state = initialState, action) {
  switch (action.type) {
    case types.ADD_WINDOW: {
      return {
        windows: state.windows.set(action.windowId, action)
      };
    }
    default:
      return state;
  }
}
