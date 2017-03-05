import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import * as actions from '../../actions/desktop';
import Sidebar from '../Sidebar';
import ConversationWindow from '../ConversationWindow';
import './index.css';

class Desktop extends PureComponent {
  constructor(props) {
    super(props);

    this.select = this.select.bind(this);
  }

  shouldComponentUpdate(nextProps) {
    if (!nextProps.startupFinished) {
      return false;
    }

    return true; // TODO: Not optimal
  }

  select(windowId) {
    const { dispatch } = this.props;

    dispatch(actions.select(windowId));
  }

  render() {
    const { windows, active, messages, users } = this.props;

    const masWindows = windows.map(masWindow => (
      <ConversationWindow
        messages={messages.get(masWindow.windowId)}
        users={users}
        visible={masWindow.windowId === active}
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
  active: PropTypes.number.isRequired,
  messages: PropTypes.shape({}),
  users: PropTypes.shape({})
};

Desktop.defaultProps = {
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
