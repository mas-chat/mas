import * as types from '../../actions/desktop/types';
import * as windowsTypes from '../../actions/windows/types';

const initialState = {
  active: null
};

export default function windowsReducer(state = initialState, action) {
  switch (action.type) {
    case windowsTypes.ADD_WINDOW:
    case types.SELECT: {
      return {
        active: action.windowId
      };
    }
    default:
      return state;
  }
}
