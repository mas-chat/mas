import { Map } from 'immutable';
import * as types from '../../actions/windows/types';

const initialState = {
  windows: new Map()
};

export default function windowsReducer(state = initialState, action) {
  switch (action.type) {
    case types.SERVER_ADD_WINDOW: {
      return {
        windows: state.windows.set(action.data.windowId, action.data)
      };
    }
    default:
      return state;
  }
}
