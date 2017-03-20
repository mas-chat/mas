import { SELECT } from '../../actions/desktop/types';
import { ADD_WINDOW } from '../../actions/windows/types';

const initialState = {
  active: null
};

export default function windowsReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_WINDOW:
    case SELECT: {
      return {
        active: action.windowId
      };
    }
    default:
      return state;
  }
}
