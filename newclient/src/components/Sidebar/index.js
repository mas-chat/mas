import React, { Component, PropTypes } from 'react';
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
    const { windows, active } = this.props;

    const names = windows.toArray().map(masWindow => {
      const title = masWindow.name || '1on1';
      const windowId = masWindow.windowId;

      return (
        <div styleName={windowId === active ? 'selected' : ''} onClick={() => this.switch(windowId)} >
          {title}
        </div>
      );
    });

    return (
      <div styleName="sidebar">
        {names}
      </div>
    );
  }
}

Sidebar.propTypes = {
  windows: PropTypes.shape({}),
  onChange: PropTypes.func.isRequired,
  active: PropTypes.number
};

Sidebar.defaultProps = {
  windows: [],
  active: null
};

export default Sidebar;
