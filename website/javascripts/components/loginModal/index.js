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
      <a href="/auth/google" className={cx('m-google', 'button is-medium')}>
        <span className="icon is-medium">
          <i className="fa fa-google" title="Google account" />
        </span>
      </a>
    ) : null;

    const AuthButtonYahoo = config.auth.yahoo ? (
      <a href="/auth/yahoo" className={cx('m-yahoo', 'button is-medium')}>
        <span className="icon is-medium">
          <i className="fa fa-yahoo" title="Yahoo account" />
        </span>
      </a>
    ) : null;

    const AuthButtonCloudron = config.auth.cloudron ? (
      <a href="/auth/cloudron" className={cx('m-cloudron', 'button is-medium')}>
        <span className="icon is-medium">
          <i className="fa fa-cloud" title="Cloudron.io account" />
        </span>
      </a>
    ) : null;

    const AuthButtons =
      config.auth.google || config.auth.yahoo || config.auth.cloudron ? (
        <div className={cx('m-auth', 'container')}>
          <h4 className={cx('m-auth-title', 'title is-5 has-text-centered')}>Sign in with account</h4>
          {AuthButtonGoogle}
          {AuthButtonYahoo}
          {AuthButtonCloudron}
        </div>
      ) : null;

    const loginPanel = (
      <section className="section">
        <h4 className="title is-5 has-text-centered">Sign in</h4>
        <label className="label" htmlFor="username">
          Username or email
        </label>
        <p className="control has-icon has-icon-left">
          <input
            id="username"
            autoFocus
            className="input"
            type="text"
            value={this.state.userName}
            onChange={this.handleChangeUserName}
          />
          <i className="fa fa-user" />
        </p>
        <label className="label" htmlFor="password">
          Password
        </label>
        <p className="control has-icon has-icon-left">
          <input
            id="password"
            className="input"
            type="password"
            value={this.state.password}
            onChange={this.handleChangePassword}
          />
          <i className="fa fa-key" />
        </p>
        {this.state.invalidLogin ? <span className="help is-danger">{this.state.invalidLogin}</span> : null}
        <p className={cx('m-controls', 'control')}>
          <button onClick={this.handleLogin} className="button is-primary is-fullwidth">
            Enter
          </button>
        </p>
        {AuthButtons}
        <div className={cx('m-forgot')} onClick={this.switchToForgotPassword}>
          Forgot password?
        </div>
      </section>
    );

    const forgotPasswordPanel = (
      <section className="section">
        <h4 className="title is-5 has-text-centered">Reset your password</h4>
        <label className="label" htmlFor="email">
          Type your email
        </label>
        <p className="control has-icon has-icon-left">
          <input
            id="email"
            autoFocus
            className="input"
            type="text"
            value={this.state.forgotEmail}
            onChange={this.handleChangeForgotEmail}
          />
          <i className="fa fa-user" />
        </p>
        <p className={cx('m-controls', 'control')}>
          <button onClick={this.handleResetPassword} className="button is-primary is-fullwidth">
            Proceed
          </button>
        </p>
        <div className={cx('m-forgot')} onClick={this.switchToLogin}>
          Back to sign
        </div>
      </section>
    );

    const forgotPasswordDonePanel = (
      <section className="section">
        <h4 className="title is-5 has-text-centered">Done</h4>
        <p>Password reset email sent! See your spam folder if you don&apos;t see it in couple minutes.</p>
        <p className={cx('m-controls', 'control')}>
          <button onClick={this.switchToLogin} className="button is-primary is-fullwidth">
            Ok
          </button>
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
      <div className="modal is-active">
        <div onClick={this.props.onHide} className={cx('m-background', 'modal-background')} />
        <div className="modal-container">
          <div className={cx('m-content', 'modal-content')}>{panel}</div>
        </div>
        <button onClick={this.props.onHide} className="modal-close" />
      </div>
    );
  }
}

LoginModal.propTypes = {
  onHide: PropTypes.func.isRequired
};

export default LoginModal;
