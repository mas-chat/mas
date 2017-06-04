import { SELECT } from '../../actions/desktop/types';
import { ADD_WINDOW } from '../../actions/windows/types';

const initialState = {
  active: null,
  isMobile: true
};

export default function windowsReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_WINDOW:
    case SELECT: {
      return {
        active: action.windowId,
        isMobile: state.isMobile
      };
    }
    default:
      return state;
  }
}
