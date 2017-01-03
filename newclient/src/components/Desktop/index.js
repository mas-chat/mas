import React from 'react';
import { connect } from 'react-redux';
import Sidebar from '../Sidebar';
import ConversationMessage from '../ConversationMessage';
import './index.css';

const Desktop = ({ messages }) => {
  const msgs = messages.map(msg =>
    <ConversationMessage ts={msg.ts} body={msg.body} userId={msg.userId} />);

  return (
    <div styleName="desktop">
      <Sidebar />
      Works! messages: {msgs}
    </div>
  );
};

Desktop.propTypes = {
  messages: React.PropTypes.shape({})
};

const mapStateToProps = state => ({
  messages: state.messages.messages.toArray()
});

export default connect(mapStateToProps)(Desktop);
