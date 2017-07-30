/* global config */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import 'whatwg-fetch';
import Formsy from 'formsy-react';
import classNames from 'classnames/bind';
import styles from './index.css';
import RegisterModalInput from '../registerModalInput';
import RegisterModalPassword from '../registerModalPassword';
import RegisterModalCheckbox from '../registerModalCheckbox';

const cx = classNames.bind(styles);

class RegisterModal extends Component {
    constructor(props) {
        super(props);

        this.state = {
            validDetails: false,
            showErrors: false
        };

        this.enableButton = this.enableButton.bind(this);
        this.disableButton = this.disableButton.bind(this);
        this.register = this.register.bind(this);
    }

    enableButton() {
        this.setState({ validDetails: true });
    }

    disableButton() {
        this.setState({ validDetails: false });
    }

    register(model, reset, invalidate) {
        this.setState({ showErrors: false });

        fetch('/register', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(model),
            credentials: 'include'
        }).then(response => response.json())
            .then(data => {
                if (data.success === true) {
                    // Server has set the cookie, just redirect
                    window.location.pathname = '/app/';
                } else {
                    this.setState({ showErrors: true });
                    invalidate(data.errors);
                }
            });
    }

    render() {
        const RegisterButtonGoogle = config.auth.google ? (
            <a href="/auth/google" className={cx('google')}>
                <span className={cx('icon', 'is-medium')}>
                    <i className="fa fa-google" title="Google account" />
                </span>
            </a>
        ) : null;

        const RegisterButtonYahoo = config.auth.yahoo ? (
            <a href="/auth/yahoo" className={cx('yahoo')}>
                <span className={cx('icon', 'is-medium')}>
                    <i className="fa fa-yahoo" title="Yahoo account" />
                </span>
            </a>
        ) : null;

        const RegisterButtonCloudron = config.auth.cloudron ? (
            <a href="/auth/cloudron" className={cx('cloudron')}>
                <span className={cx('icon', 'is-medium')}>
                    <i className="fa fa-cloud" title="Cloudron.io account" />
                </span>
            </a>
        ) : null;

        const ExtRegister = (config.auth.google || config.auth.yahoo || config.auth.cloudron) ? (
            <nav className={cx('ext')}>
                <div className={cx('level-left')}>
                    <div className={cx('level-item')}>
                        Register with an existing account:
                    </div>
                </div>
                <div className={cx('level-right')}>
                    <div className={cx('level-item')}>
                        {RegisterButtonGoogle}
                        {RegisterButtonYahoo}
                        {RegisterButtonCloudron}
                    </div>
                </div>
            </nav>
        ) : null;

        return (
            <div className={cx('modal', 'is-active')}>
                <div onClick={this.props.onHide} className={cx('background')} />
                <div className={cx('modal-content')}>
                    <section className={cx('section')}>
                        <Formsy.Form onValidSubmit={this.register} onValid={this.enableButton} onInvalid={this.disableButton}>
                            <h4 className={cx('title', 'is-4', 'has-text-centered')}>Instant registration, just fill the fields!</h4>

                            <RegisterModalInput showErrorMessage={this.state.showErrors} autoFocus name="name" validations="minLength:6" validationError="Please enter at least 6 characters" label="Your name" autocomplete="name" required />
                            <RegisterModalInput showErrorMessage={this.state.showErrors} name="email" validations="isEmail" validationError="This is not a valid email" label="Email address" autocomplete="email" required />
                            <RegisterModalPassword showErrorMessage={this.state.showErrors} name="password" validations="minLength:6" validationError="This is not a valid password" label="Password" autocomplete="new-password" required />
                            <RegisterModalPassword name="passwordAgain" validations="equalsField:password" validationError="This is not a valid password" label="Password (again)" autocomplete="new-password" required />
                            <RegisterModalInput showErrorMessage={this.state.showErrors} name="nick" validations="minLength:3" validationError="This is not a valid nick" label="Nickname" autocomplete="nickname" required />
                            <RegisterModalCheckbox name="tos" validationError="You must agree TOS" label="I agree MAS Terms of Service" required />

                            <Link to="tos"> Privacy Policy and Terms of Service</Link>

                            <p className={cx('control')}>
                                <button type="submit" className={cx('button', 'is-primary')} disabled={!this.state.validDetails}>Register</button>
                            </p>
                        </Formsy.Form>
                        {ExtRegister}
                    </section>
                </div>
                <button onClick={this.props.onHide} className={cx('modal-close')} />
            </div>
        );
    }
}

RegisterModal.propTypes = {
    onHide: PropTypes.func.isRequired
};

export default RegisterModal;

