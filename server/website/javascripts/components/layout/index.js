import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames/bind';
import LoginModal from '../loginModal';
import styles from './index.css';

const cx = classNames.bind(styles);

const pages = [
    'pricing',
    'support',
    'about'
];

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

        const navBar = pages.map(page => <NavLink key={page} className={cx('navbar-item')} activeClassName={cx('menu-item-active')} to={`/${page}`}>{page}</NavLink>);

        const loginModal = this.state.loginModalOpen ? <LoginModal onHide={this.toggleLoginModal} /> : null;

        return (
            <div className={cx('container')}>
                <nav className={cx('navbar')}>
                    <div className={cx('navbar-brand')}>
                        <NavLink className={cx('home')} to="home">
                            <i className="fa fa-comment" />
                            <span className={cx('title')}>
                                MeetAndSpeak
                            </span>
                        </NavLink>
                        <div className={cx('navbar-item')}>
                            <button onClick={this.toggleLoginModal} className={cx('button')}>
                                <span>
                                    Sign In
                                </span>
                            </button>
                        </div>
                        <div className={cx('burger', this.state.menuOpen ? 'is-active' : '')} onClick={this.handleMenuClick}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <div className={cx('navbar-menu', this.state.menuOpen ? 'is-active' : '')}>
                        <div className={cx('navbar-end')} onClick={this.handleMenuClick}>
                            {navBar}
                        </div>
                    </div>
                </nav>
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
