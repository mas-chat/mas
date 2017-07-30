/* global config */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import 'whatwg-fetch';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);

class LoginModal extends Component {
    constructor(props) {
        super(props);

        this.state = {
            userName: '',
            password: '',
            forgotEmail: '',
            invalidLogin: false,
            mode: 'login'
        };

        this.handleChangeUserName = this.handleChangeUserName.bind(this);
        this.handleChangePassword = this.handleChangePassword.bind(this);
        this.handlePasswordKeyPress = this.handlePasswordKeyPress.bind(this);
        this.handleChangeForgotEmail = this.handleChangeForgotEmail.bind(this);
        this.handleLogin = this.handleLogin.bind(this);
        this.handleResetPassword = this.handleResetPassword.bind(this);
        this.switchToForgotPassword = this.switchToForgotPassword.bind(this);
        this.switchToForgotPasswordDone = this.switchToForgotPasswordDone.bind(this);
        this.switchToLogin = this.switchToLogin.bind(this);
    }

    handleChangeUserName(event) {
        this.setState({ userName: event.target.value, invalidLogin: false });
    }

    handleChangePassword(event) {
        this.setState({ password: event.target.value, invalidLogin: false });
    }

    handleChangeForgotEmail(event) {
        this.setState({ forgotEmail: event.target.value });
    }

    handlePasswordKeyPress(event) {
        if (event.key === 'Enter') {
            this.handleLogin();
        }
    }

    handleLogin() {
        fetch('/login', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: this.state.userName, password: this.state.password }),
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success === true) {
                    // Server has set the session cookie, just redirect
                    window.location.pathname = '/app/';
                } else {
                    this.setState({ invalidLogin: data.msg, password: '' });
                }
            });
    }

    handleResetPassword() {
        fetch('/forgot-password', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: this.state.forgotEmail }),
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success === true) {
                    this.setState({ mode: 'forgotPasswordDone' });
                }
            });
    }

    switchToForgotPassword() {
        this.setState({ mode: 'forgotPassword' });
    }

    switchToForgotPasswordDone() {
        this.setState({ mode: 'forgotPasswordDone' });
    }

    switchToLogin() {
        this.setState({ mode: 'login' });
    }

    render() {
        const AuthButtonGoogle = config.auth.google ? (
            <a href="/auth/google" className={cx('google')}>
                <span className={cx('icon', 'is-medium')}>
                    <i className="fa fa-google" title="Google account" />
                </span>
            </a>
        ) : null;

        const AuthButtonYahoo = config.auth.yahoo ? (
            <a href="/auth/yahoo" className={cx('yahoo')}>
                <span className={cx('icon', 'is-medium')}>
                    <i className="fa fa-yahoo" title="Yahoo account" />
                </span>
            </a>
        ) : null;

        const AuthButtonCloudron = config.auth.cloudron ? (
            <a href="/auth/cloudron" className={cx('cloudron')}>
                <span className={cx('icon', 'is-medium')}>
                    <i className="fa fa-cloud" title="Cloudron.io account" />
                </span>
            </a>
        ) : null;

        const AuthButtons = (config.auth.google || config.auth.yahoo || config.auth.cloudron) ? (
            <div className={cx('auth-section', 'has-text-centered')}>
                <h4 className={cx('auth-title', 'is-5', 'has-text-centered')}>
                    Or sign in with account
                </h4>
                {AuthButtonGoogle}
                {AuthButtonYahoo}
                {AuthButtonCloudron}
            </div>
        ) : null;

        const loginPanel = (
            <section className={cx('section')}>
                <h4 className={cx('title', 'is-5', 'has-text-centered')}>Sign in</h4>
                <label className={cx('label')} htmlFor="username">Username or email</label>
                <p className={cx('control', 'has-icon')}>
                    <input id="username" autoFocus className={cx('input')} type="text" value={this.state.userName} onChange={this.handleChangeUserName} />
                    <i className={cx('fa', 'fa fa-user')} />
                </p>
                <label className={cx('label')} htmlFor="password">Password</label>
                <p className={cx('control', 'has-icon')}>
                    <input id="password" className={cx('input')} type="password" value={this.state.password} onKeyPress={this.handlePasswordKeyPress} onChange={this.handleChangePassword} />
                    <i className={cx('fa', 'fa fa-key')} />
                </p>
                {this.state.invalidLogin ? <span className={cx('help', 'is-danger')}>{this.state.invalidLogin}</span> : null}
                <p className={cx('control')}>
                    <button onClick={this.handleLogin} className={cx('login', 'button', 'is-primary', 'is-fullwidth')}>Sign In</button>
                </p>
                <div className={cx('forgot')} onClick={this.switchToForgotPassword}>Forgot password?</div>
                {AuthButtons}
            </section>
        );

        const forgotPasswordPanel = (
            <section className={cx('section')}>
                <h4 className={cx('title', 'is-5', 'has-text-centered')}>Reset your password</h4>
                <label className={cx('label')} htmlFor="email">Type your email</label>
                <p className={cx('control', 'has-icon')}>
                    <input id="email" autoFocus className={cx('input')} type="text" value={this.state.forgotEmail} onChange={this.handleChangeForgotEmail} />
                    <i className={cx('fa', 'fa fa-user')} />
                </p>
                <p className={cx('control')}>
                    <button onClick={this.handleResetPassword} className={cx('button', 'is-primary', 'is-fullwidth')}>Proceed</button>
                </p>
                <div className={cx('forgot')} onClick={this.switchToLogin}>Cancel</div>
            </section>
        );

        const forgotPasswordDonePanel = (
            <section className={cx('section')}>
                <h4 className={cx('title', 'is-5', 'has-text-centered')}>Done</h4>
                <p>Password reset email sent! See your spam folder if you don&apos;t see it in couple minutes.</p>
                <p className={cx('control')}>
                    <button onClick={this.switchToLogin} className={cx('button', 'is-primary', 'is-fullwidth')}>Ok</button>
                </p>
            </section>
        );

        let panel;

        if (this.state.mode === 'login') {
            panel = loginPanel;
        } else if (this.state.mode === 'forgotPassword') {
            panel = forgotPasswordPanel;
        } else {
            panel = forgotPasswordDonePanel;
        }

        return (
            <div className={cx('modal', 'is-active')}>
                <div onClick={this.props.onHide} className={cx('background')} />
                <div className={cx('modal-content')}>
                    {panel}
                </div>
                <button onClick={this.props.onHide} className={cx('modal-close')} />
            </div>
        );
    }
}

LoginModal.propTypes = {
    onHide: PropTypes.func.isRequired
};

export default LoginModal;
