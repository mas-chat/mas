import React from 'react';
import { connect } from 'react-redux';
import Sidebar from '../Sidebar';
import ConversationMessage from '../ConversationMessage';
import { getFormattedMessages } from '../../selectors/message'
import './index.css';

const Desktop = ({ messages }) => {
  const msgs = messages.map(msg =>
    <ConversationMessage ts={msg.ts} body={msg.body} userId={msg.userId} />);

  return (
    <div styleName="desktop">
      <Sidebar />
      <div styleName="content">
        {msgs}
      </div>
    </div>
  );
};

Desktop.propTypes = {
  messages: React.PropTypes.shape({})
};

const mapStateToProps = state => ({
  messages: getFormattedMessages(state)
});

export default connect(mapStateToProps)(Desktop);
