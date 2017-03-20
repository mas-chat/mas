import { Map } from 'immutable';
import { FINISH_INIT } from '../../actions/desktop/types';
import { ADD_MESSAGE } from '../../actions/messages/types';

const initialState = { // TODO: Use immutable map also here
  messages: new Map(),
  startupFinished: false
};

export default function messagesReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_MESSAGE: {
      const windowId = action.windowId;
      let messages = state.messages;

      if (!messages.has(windowId)) {
        messages = messages.set(windowId, new Map());
      }

      return {
        messages: messages.setIn([ windowId, action.gid ], action),
        startupFinished: state.startupFinished
      };
    }
    case FINISH_INIT: {
      return {
        messages: state.messages,
        startupFinished: true
      };
    }
    default:
      return state;
  }
}
