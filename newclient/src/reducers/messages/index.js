import { Map } from 'immutable';
import * as types from '../../actions/messages/types';

const initialState = { // TODO: Use immutable map also here
  messages: new Map(),
  startupFinished: false
};

export default function messagesReducer(state = initialState, action) {
  switch (action.type) {
    case types.SERVER_ADD_MESSAGE: {
      const windowId = action.data.windowId;
      let messages = state.messages;

      if (!messages.has(windowId)) {
        messages = messages.set(windowId, new Map());
      }

      return {
        messages: messages.setIn([ windowId, action.data.gid ], action.data),
        startupFinished: state.startupFinished
      };
    }
    case types.SERVER_FINISH_INIT: {
      return {
        messages: state.messages,
        startupFinished: true
      };
    }
    default:
      return state;
  }
}
