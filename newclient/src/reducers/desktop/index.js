import * as types from '../../actions/desktop/types';

const initialState = {
  active: null
};

export default function windowsReducer(state = initialState, action) {
  switch (action.type) {
    case types.SELECT: {
      return {
        active: action.windowId
      };
    }
    default:
      return state;
  }
}
