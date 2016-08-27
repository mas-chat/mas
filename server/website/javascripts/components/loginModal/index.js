import React, { Component } from 'react';
import 'whatwg-fetch';
import Cookies from 'js-cookie';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);

class LoginModal extends Component {
    constructor(props) {
        super(props);

        this.state = {
            userName: '',
            password: '',
            invalidLogin: false
        };

        this.handleChangeUserName = this.handleChangeUserName.bind(this);
        this.handleChangePassword = this.handleChangePassword.bind(this);
        this.handleLogin = this.handleLogin.bind(this);
    }

    handleChangeUserName(event) {
        this.setState({
            userName: event.target.value,
            invalidLogin: false
        });
    }

    handleChangePassword(event) {
        this.setState({
            password: event.target.value,
            invalidLogin: false
        });
    }

    handleLogin() {
        fetch('/login', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: this.state.userName,
                password: this.state.password
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success === true) {
                    Cookies.set('auth', `m${data.userId}-${data.secret}-n`, { expires: 7, path: '/' });

                    window.location.pathname = '/app/';
                } else {
                    this.setState({
                        invalidLogin: true,
                        password: ''
                    });
                }
            });
    }

    render() {
        return (
            <div className="modal is-active">
                <div className={`${cx('background')} modal-background`} />
                <div className="modal-container">
                    <div className={`${cx('content')} modal-content`}>
                        <section className="section">
                            <h4 className="title is-4 has-text-centered">Log in</h4>
                            <label className="label" htmlFor="username">Username or email</label>
                            <p className="control has-icon has-icon-left">
                                <input id="username" autoFocus className="input" type="text" placeholder="User name or email" value={this.state.userName} onChange={this.handleChangeUserName} />
                                <i className="fa fa-user" />
                            </p>
                            <label className="label" htmlFor="password">Password</label>
                            <p className="control has-icon has-icon-left">
                                <input id="password" className="input" type="password" placeholder="Password" value={this.state.password} onChange={this.handleChangePassword} />
                                <i className="fa fa-key" />
                            </p>
                            {this.state.invalidLogin ? <span className="help is-danger">Invalid login credentials.</span> : null}
                            <p className={`${cx('controls')} control`}>
                                <button onClick={this.handleLogin} className="button is-primary">Login</button>
                                <button onClick={this.props.onHide} className="button is-link">Cancel</button>
                            </p>
                        </section>
                    </div>
                </div>
                <button onClick={this.props.onHide} className="modal-close" />
            </div>
        );
    }
}

LoginModal.propTypes = {
    onHide: React.PropTypes.func.isRequired
};

export default LoginModal;
