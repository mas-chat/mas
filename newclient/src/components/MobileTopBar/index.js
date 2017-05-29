import React from 'react';
import PropTypes from 'prop-types';
import './index.css';

const MobileTopBar = ({ name, title, onNameClick, open }) => {
  const namePart = name ? `${name} ${open ? 'v' : '>'}` : null;

  return (
    <div styleName="titleBar">
      <div styleName={`container ${open ? 'sidebarOpen' : ''}`}>
        <div styleName="logo">[M]</div>
        <div styleName="namePart button" onClick={onNameClick}>#{namePart}</div>
      </div>
      <div styleName="topicPart">{title}</div>
      <div styleName="menu button">Menu&#8230;</div>
    </div>
  );
};

MobileTopBar.propTypes = {
  name: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  onNameClick: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired
};

export default MobileTopBar;
