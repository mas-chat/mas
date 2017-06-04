import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { select } from '../../actions/desktop';
import { sendMessage } from '../../actions/windows';
import Sidebar from '../Sidebar';
import MobileTopBar from '../MobileTopBar';
import Window from '../Window';
import './index.css';

class Desktop extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      sidebarVisible: !props.isMobile
    };

    this.onSend = this.onSend.bind(this);
    this.select = this.select.bind(this);
    this.onToggleSidebar = this.onToggleSidebar.bind(this);
  }

  onSend(text, windowId) {
    const { dispatch } = this.props;

    dispatch(sendMessage(text, windowId));
  }

  onToggleSidebar() {
    this.setState({ sidebarVisible: !this.state.sidebarVisible });
  }

  select(windowId) {
    const { dispatch, isMobile } = this.props;

    if (isMobile) {
      this.setState({ sidebarVisible: false });
    }

    dispatch(select(windowId));
  }

  render() {
    const { windows, active, messages, users, isMobile } = this.props;

    const masWindows = windows.valueSeq().map(masWindow => (
      <Window
        key={masWindow.windowId}
        messages={messages.get(masWindow.windowId).sortBy(message => message.gid).toArray()}
        onSend={this.onSend}
        users={users}
        visible={masWindow.windowId === active}
        windowId={masWindow.windowId}
      />
    ));

    let mobileTopBar = null;
    let sideBar = null;

    if (isMobile) {
      const activeWindow = windows.get(active);
      const title = activeWindow ? activeWindow.topic : '';
      const name = activeWindow && isMobile ? `${activeWindow.name}` : '';

      mobileTopBar = (
        <MobileTopBar
          onNameClick={this.onToggleSidebar}
          name={name}
          title={title}
          open={this.state.isSidebarVisible}
        />
      );
    }

    sideBar = <Sidebar windows={windows} users={users} active={active} onChange={this.select} />;

    // TODO: Only render one window on mobile
    // TODO: fullwidth kikka ei toimi

    return (
      <div styleName="desktop">
        {mobileTopBar}
        <div styleName="content">
          {this.state.sidebarVisible ? sideBar : null}
          <div styleName={`windowArea ${isMobile ? 'fullWidth' : ''}`}>
            {masWindows}
          </div>
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
  users: PropTypes.shape({}),
  isMobile: PropTypes.bool.isRequired
};

Desktop.defaultProps = {
  active: null,
  messages: {},
  users: {}
};

const mapStateToProps = state => ({
  windows: state.windows.windows,
  active: state.desktop.active,
  isMobile: state.desktop.isMobile,
  messages: state.messages.messages,
  users: state.users.users
});

export default connect(mapStateToProps)(Desktop);
