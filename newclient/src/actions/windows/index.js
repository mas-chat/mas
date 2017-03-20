import { ADD_MESSAGE } from '../messages/types';
import socket from '../../utils/socket';
import userInfo from '../../utils/userInfo';

export function sendMessage(text, windowId) { // eslint-disable-line import/prefer-default-export
  return dispatch => {
    socket.send({
      id: 'SEND',
      text,
      windowId
    }).then(resp => {
      if (resp.status !== 'OK') {
        // TODO: show resp.errorMsg
      } else {
        dispatch({
          type: ADD_MESSAGE,
          body: text,
          userId: userInfo.userId,
          ts: resp.ts,
          gid: resp.gid,
          windowId
        });
      }
    });
  };
}
