import React, { PropTypes } from 'react';
import Textarea from 'react-textarea-autosize';
import { AutoSizer, List } from 'react-virtualized';
import ConversationMessage from '../ConversationMessage';
import './index.css';

const ConversationWindow = ({ messages, users, visible, windowId, onSend }) => {
  let textAreaInput = null;

  function rowRenderer({ index, style }) {
    const msg = messages[index];
    const nick = msg.userId ? users.get(msg.userId).nick.mas : null;

    return (
      <ConversationMessage
        style={style}
        key={msg.gid}
        ts={msg.ts}
        body={msg.body}
        nick={nick}
      />
    );
  }

  function onKeyPress(e) {
    if (e.charCode === 13) {
      e.preventDefault();
      onSend(textAreaInput.value, windowId);
      textAreaInput.value = '';
    }
  }

  return (
    <div styleName={`window ${visible ? '' : 'hidden'}`}>
      <div styleName="messages">
        <AutoSizer>
          {({ height, width }) => (
            <List
              width={width}
              height={height}
              rowCount={messages.length}
              rowHeight={20}
              rowRenderer={rowRenderer}
              scrollToIndex={messages.length - 1}
            />
          )}
        </AutoSizer>
      </div>
      <div styleName="controls">
        <Textarea
          ref={(input) => { textAreaInput = input; }}
          styleName="textarea"
          onKeyPress={onKeyPress}
        />
      </div>
    </div>
  );
};

ConversationWindow.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  users: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSend: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
  windowId: PropTypes.number.isRequired
};

export default ConversationWindow;
