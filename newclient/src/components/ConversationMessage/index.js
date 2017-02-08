import React from 'react';
import moment from 'moment';
import './index.css';

const ConversationMessage = ({ ts, body, nick }) => {
  const formattedTs = moment.unix(ts).format('HH:mm');

  return (
    <div styleName="message">
      <div styleName="timestamp">
        {formattedTs}
      </div>
      <div styleName="content">
        <span styleName="nick">
          {nick}
        </span> {body}
      </div>
    </div>
  );
};

ConversationMessage.propTypes = {
  ts: React.PropTypes.number.isRequired,
  body: React.PropTypes.string,
  nick: React.PropTypes.string
};

ConversationMessage.defaultProps = {
  body: null,
  nick: null
};

export default ConversationMessage;
