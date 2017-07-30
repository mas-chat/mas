import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
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

        const navBar = pages.map(page => <Link key={page} className={cx('nav-item')} activeClassName={cx('menu-item-active')} to={page}>{page}</Link>);

        const loginModal = this.state.loginModalOpen ? <LoginModal onHide={this.toggleLoginModal} /> : null;

        return (
            <div className={cx('container', 'widescreen')}>
                <nav className={cx('menu', 'nav')}>
                    <div className={cx('nav-left')}>
                        <Link className={cx('home', 'nav-item')} to="home">
                            <div className={cx('logo')}>
                                <i className="fa fa-comment" />
                            </div>
                            <div className={cx('name')}>
                                MeetAndSpeak <span className={cx('beta')}>BETA</span>
                            </div>
                        </Link>
                    </div>
                    <div className={cx('nav-center')}>
                        <div className={cx('nav-item')}>
                            <button onClick={this.toggleLoginModal} className={cx('button')}>
                                <span>
                                    Sign In
                                </span>
                            </button>
                        </div>
                    </div>
                    <div onClick={this.handleMenuClick} className={cx('nav-right', 'nav-menu', this.state.menuOpen ? 'is-active' : '')}>
                        {navBar}
                    </div>
                    <span onClick={this.handleMenuClick} className={cx('nav-toggle')}>
                        <span />
                        <span />
                        <span />
                    </span>
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
