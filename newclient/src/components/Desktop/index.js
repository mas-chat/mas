import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import Sidebar from '../Sidebar';
import ConversationMessage from '../ConversationMessage';
import './index.css';

class Desktop extends PureComponent {
  shouldComponentUpdate(nextProps) {
    if (!nextProps.startupFinished) {
      return false;
    }

    return super.shouldComponentUpdate();
  }

  render() {
    const { messages, users } = this.props;

    const msgs = messages.toArray().map(msg => {
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
      <div styleName="desktop">
        <Sidebar />
        <div styleName="content">
          {msgs}
        </div>
      </div>
    );
  }
}

Desktop.propTypes = {
  messages: React.PropTypes.shape({}),
  users: React.PropTypes.shape({})
};

const mapStateToProps = state => ({
  messages: state.messages.messages,
  startupFinished: state.messages.startupFinished,
  users: state.users.users
});

export default connect(mapStateToProps)(Desktop);
