import React, { PropTypes } from 'react';
import ConversationMessage from '../ConversationMessage';
import './index.css';

const ConversationWindow = ({ messages, users, visible }) => {
  const msgs = messages.map(msg => {
    const nick = msg.userId ? users.get(msg.userId).nick.mas : null;

    return (
      <ConversationMessage
        key={msg.gid}
        ts={msg.ts}
        body={msg.body}
        nick={nick}
      />
    );
  });

  return (
    <div styleName={`window ${visible ? '' : 'hidden'}`}>
      <div>
        {msgs}
      </div>
      <textarea rows="1" cols="50">Write something here</textarea>
    </div>
  );
};

ConversationWindow.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  users: PropTypes.arrayOf(PropTypes.object).isRequired,
  visible: PropTypes.bool.isRequired
};

export default ConversationWindow;
