import React, { Component } from 'react';
import { HOC } from 'formsy-react';

class RegisterModalPassword extends Component {
    constructor(props) {
        super(props);

        this.changeValue = this.changeValue.bind(this);
    }

    changeValue(event) {
        this.props.setValue(event.currentTarget.value);
    }

    render() {
        const error = this.props.showError();
        const errorMessage = this.props.getErrorMessage();
        const inputClass = `input ${error ? 'is-danger' : 'is-success'}`;
        const value = this.props.getValue();
        let icon = null;

        if (error && value) {
            icon = <i className="fa fa-warning" />;
        } else if (value) {
            icon = <i className="fa fa-check" />;
        }

        return (
            <span>
                <label className="label">{this.props.label}</label>
                <p className="control has-icon has-icon-right">
                    <input className={inputClass} type="password" value={value} onChange={this.changeValue} />
                    {icon}
                    {this.props.showErrorMessage ? <span className="help is-danger">{errorMessage}</span> : null}
                </p>
            </span>
        );
    }
}

RegisterModalPassword.propTypes = {
    showErrorMessage: React.PropTypes.bool,
    label: React.PropTypes.string.isRequired
};

export default HOC(RegisterModalPassword); // eslint-disable-line new-cap
