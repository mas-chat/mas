import React from 'react';
import './index.css';

const ConversationMessage = ({ ts, body, userId }) =>
  <div>
    foo: <span styleName="timestamp">{ts}</span>: {userId} {body}
  </div>;

ConversationMessage.propTypes = {
  ts: React.PropTypes.number.isRequired,
  body: React.PropTypes.string,
  userId: React.PropTypes.string.isRequired
};

export default ConversationMessage;
