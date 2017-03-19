import React, { PropTypes } from 'react';
import moment from 'moment';
import './index.css';

const ConversationMessage = ({ style, ts, body, nick }) => {
  const formattedTs = moment.unix(ts).format('HH:mm');

  return (
    <div style={style} styleName="message">
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
  ts: PropTypes.number.isRequired,
  body: PropTypes.string,
  nick: PropTypes.string,
  style: PropTypes.string.isRequired
};

ConversationMessage.defaultProps = {
  body: null,
  nick: null
};

export default ConversationMessage;
