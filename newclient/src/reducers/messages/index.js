import { Map } from 'immutable';
import * as types from '../../actions/messages/types';

const initialState = {
  messages: Map(), // eslint-disable-line new-cap
  startupFinished: false
};

export default function messages(state = initialState, action) {
  switch (action.type) {
    case types.ADD_MESSAGE_SERVER: {
      return {
        messages: state.messages.set(action.data.gid, action.data)
      };
    }
    case types.FINISH_STARTUP_SERVER: {
      return {
        messages: state.messages,
        startupFinished: true
      };
    }
    default:
      return state;
  }
}
