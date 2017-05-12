import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './index.css';

class Sidebar extends Component {
  constructor(props) {
    super(props);

    this.switch = this.switch.bind(this);
  }

  switch(windowId) {
    this.props.onChange(windowId);
  }

  render() {
    const { windows, active, users } = this.props;
    const groups = [];
    const private1on1s = [];

    windows.toArray().forEach(masWindow => {
      let destination;
      let title;
      const windowId = masWindow.windowId;

      if (masWindow.windowType === 'group') {
        destination = groups;
        title = masWindow.name;
      } else {
        destination = private1on1s;
        title = users.get(masWindow.userId).nick.mas;
      }

      destination.push(
        <div
          key={windowId}
          styleName={`item ${windowId === active ? 'selected' : ''}`}
          onClick={() => this.switch(windowId)}
        >
          {title}
        </div>
      );
    });

    return (
      <div styleName="sidebar">
        <div styleName="section">
          <div styleName="heading">GROUPS</div>
          {groups}
        </div>
        <div styleName="section">
          <div styleName="heading">1-ON-1S</div>
          {private1on1s}
        </div>
      </div>
    );
  }
}

Sidebar.propTypes = {
  windows: PropTypes.shape({}),
  onChange: PropTypes.func.isRequired,
  active: PropTypes.number,
  users: PropTypes.shape({}).isRequired
};

Sidebar.defaultProps = {
  windows: [],
  active: null
};

export default Sidebar;
