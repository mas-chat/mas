import React, { PureComponent } from 'react';
import moment from 'moment';
import './index.css';

export default class ConversationMessage extends PureComponent {
  render() {
    const { ts, body, nick } = this.props;
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
  }
}

ConversationMessage.propTypes = {
  ts: React.PropTypes.number.isRequired,
  body: React.PropTypes.string,
  nick: React.PropTypes.string
};
