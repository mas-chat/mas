import { Map } from 'immutable';
import { FINISH_INIT } from '../../actions/desktop/types';
import { ADD_MESSAGE, ADD_MESSAGES } from '../../actions/messages/types';
import { setstartUpFinished } from '../../store/configureStore';

const initialState = { // TODO: Use immutable map also here
  messages: new Map()
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
        messages: messages.setIn([ windowId, action.gid ], action)
      };
    }
    case ADD_MESSAGES: {
      let messages = state.messages;

      action.messages.forEach(windowMessages => {
        if (!messages.has(windowMessages.windowId)) {
          messages = messages.set(windowMessages.windowId, new Map());
        }

        windowMessages.messages.forEach(message => {
          messages = messages.setIn([ windowMessages.windowId, message.gid ], message);
        });
      });

      return { messages };
    }
    case FINISH_INIT: {
      console.log('Setting startUpFinished = true'); // eslint-disable-line

      setstartUpFinished(true);

      return state;
    }
    default:
      return state;
  }
}
