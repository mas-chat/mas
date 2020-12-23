import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames/bind';
import LoginModal from '../loginModal';
import styles from './index.css';

const cx = classNames.bind(styles);

const pages = ['about'];

class Layout extends Component {
  constructor(props) {
    super(props);

    this.state = {
      menuOpen: false,
      loginModalOpen: false
    };

    this.handleMenuClick = this.handleMenuClick.bind(this);
    this.toggleLoginModal = this.toggleLoginModal.bind(this);
  }

  handleMenuClick() {
    this.setState({ menuOpen: !this.state.menuOpen });
  }

  toggleLoginModal() {
    this.setState({ loginModalOpen: !this.state.loginModalOpen });
  }

  render() {
    const { children } = this.props;

    const navBar = pages.map(page => (
      <NavLink key={page} className={cx('m-menu-item')} activeClassName={cx('m-menu-item-active')} to={page}>
        {page}
      </NavLink>
    ));

    const loginModal = this.state.loginModalOpen ? <LoginModal onHide={this.toggleLoginModal} /> : null;

    return (
      <div className="container">
        <div className={cx('m-menu', 'nav')}>
          <div className="nav-left">
            <NavLink className={cx('m-home')} to="home">
              <div className={cx('m-icon', 'icon')}>
                <i className="fa fa-map-signs" />
              </div>
              MeetAndSpeak
            </NavLink>
          </div>
          <div className={`nav-right nav-menu ${this.state.menuOpen ? 'is-active' : ''}`}>{navBar}</div>
          <span onClick={this.handleMenuClick} className="nav-toggle">
            <span />
            <span />
            <span />
          </span>

          <span className="nav-item">
            <button onClick={this.toggleLoginModal} className={cx('m-button', 'button is-primary is-outlined')}>
              <span>Sign In</span>
            </button>
          </span>
        </div>
        {loginModal}
        {children}
      </div>
    );
  }
}

Layout.propTypes = {
  children: PropTypes.node.isRequired
};

export default Layout;
