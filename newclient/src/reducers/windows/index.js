import { Map } from 'immutable';
import { ADD_WINDOW } from '../../actions/windows/types';

const initialState = {
  windows: new Map()
};

export default function windowsReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_WINDOW: {
      return {
        windows: state.windows.set(action.windowId, action)
      };
    }
    default:
      return state;
  }
}
