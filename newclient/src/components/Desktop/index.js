import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { select } from '../../actions/desktop';
import { sendMessage } from '../../actions/windows';
import Sidebar from '../Sidebar';
import ConversationWindow from '../ConversationWindow';
import './index.css';

class Desktop extends PureComponent {
  constructor(props) {
    super(props);

    this.onSend = this.onSend.bind(this);
    this.select = this.select.bind(this);
  }

  shouldComponentUpdate(nextProps) {
    if (!nextProps.startupFinished) {
      return false;
    }

    return true; // TODO: Not optimal
  }

  onSend(text, windowId) {
    const { dispatch } = this.props;

    dispatch(sendMessage(text, windowId));
  }

  select(windowId) {
    const { dispatch } = this.props;

    dispatch(select(windowId));
  }

  render() {
    const { windows, active, messages, users } = this.props;

    const masWindows = windows.map(masWindow => (
      <ConversationWindow
        messages={messages.get(masWindow.windowId).sortBy(message => message.gid).toArray()}
        onSend={this.onSend}
        users={users}
        visible={masWindow.windowId === active}
        windowId={masWindow.windowId}
      />
    ));

    return (
      <div styleName="desktop">
        <Sidebar windows={windows} active={active} onChange={this.select} />
        <div styleName="content">
          {masWindows}
        </div>
      </div>
    );
  }
}

Desktop.propTypes = {
  dispatch: PropTypes.func.isRequired,
  windows: PropTypes.shape({}).isRequired,
  active: PropTypes.number,
  messages: PropTypes.shape({}),
  users: PropTypes.shape({})
};

Desktop.defaultProps = {
  active: null,
  messages: {},
  users: {}
};

const mapStateToProps = state => ({
  windows: state.windows.windows,
  active: state.desktop.active,
  messages: state.messages.messages,
  startupFinished: state.messages.startupFinished,
  users: state.users.users
});

export default connect(mapStateToProps)(Desktop);
