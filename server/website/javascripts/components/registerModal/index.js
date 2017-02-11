/* global config */

import React, { Component } from 'react';
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
            <a href="/auth/google" className={cx('m-google', 'button is-medium')}>
                <span className="icon is-medium">
                    <i className="fa fa-google" title="Google account" />
                </span>
            </a>
        ) : null;

        const RegisterButtonYahoo = config.auth.yahoo ? (
            <a href="/auth/yahoo" className={cx('m-yahoo', 'button is-medium')}>
                <span className="icon is-medium">
                    <i className="fa fa-yahoo" title="Yahoo account" />
                </span>
            </a>
        ) : null;

        const RegisterButtonCloudron = config.auth.cloudron ? (
            <a href="/auth/cloudron" className={cx('m-cloudron', 'button is-medium')}>
                <span className="icon is-medium">
                    <i className="fa fa-cloud" title="Cloudron.io account" />
                </span>
            </a>
        ) : null;

        const ExtRegister = (config.auth.google || config.auth.yahoo || config.auth.cloudron) ? (
            <nav className={cx('m-ext', 'level')}>
                <div className="level-left">
                    <div className="level-item">
                        Register with an existing account:
                    </div>
                </div>
                <div className="level-right">
                    <div className="level-item">
                        {RegisterButtonGoogle}
                        {RegisterButtonYahoo}
                        {RegisterButtonCloudron}
                    </div>
                </div>
            </nav>
        ) : null;

        return (
            <div className="modal is-active">
                <div onClick={this.props.onHide} className={cx('m-background', 'modal-background')} />
                <div className="modal-container">
                    <div className={cx('m-content', 'modal-content')}>
                        <section className="section">
                            <Formsy.Form onValidSubmit={this.register} onValid={this.enableButton} onInvalid={this.disableButton}>
                                <h4 className="title is-4 has-text-centered">Register</h4>

                                <RegisterModalInput showErrorMessage={this.state.showErrors} autoFocus name="name" validations="minLength:6" validationError="Please enter at least 6 characters" label="Your name" autocomplete="name" required />
                                <RegisterModalInput showErrorMessage={this.state.showErrors} name="email" validations="isEmail" validationError="This is not a valid email" label="Email address" autocomplete="email" required />
                                <RegisterModalPassword showErrorMessage={this.state.showErrors} name="password" validations="minLength:6" validationError="This is not a valid password" label="Password" autocomplete="new-password" required />
                                <RegisterModalPassword name="passwordAgain" validations="equalsField:password" validationError="This is not a valid password" label="Password (again)" autocomplete="new-password" required />
                                <RegisterModalInput showErrorMessage={this.state.showErrors} name="nick" validations="minLength:3" validationError="This is not a valid nick" label="Nickname" autocomplete="nickname" required />
                                <RegisterModalCheckbox name="tos" validationError="You must agree TOS" label="I agree MAS Terms of Service" required />

                                <p className={cx('m-controls', 'control')}>
                                    <button type="submit" className="button is-primary" disabled={!this.state.validDetails}>Register</button>
                                </p>
                            </Formsy.Form>
                            {ExtRegister}
                        </section>
                    </div>
                </div>
                <button onClick={this.props.onHide} className="modal-close" />
            </div>
        );
    }
}

RegisterModal.propTypes = {
    onHide: React.PropTypes.func.isRequired
};

export default RegisterModal;

