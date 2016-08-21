import React, { Component } from 'react';
import { HOC } from 'formsy-react';

class RegisterModalInput extends Component {
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
                    <input className={inputClass} type="text" value={value} onChange={this.changeValue} ref={(e) => ((this.props.focus && e) ? e.focus() : false)} />
                    {icon}
                    {this.props.showErrorMessage ? <span className="help is-danger">{errorMessage}</span> : null}
                </p>
            </span>
        );
    }
}

RegisterModalInput.propTypes = {
    focus: React.PropTypes.bool,
    showErrorMessage: React.PropTypes.bool.isRequired,
    label: React.PropTypes.string.isRequired
};

export default HOC(RegisterModalInput); // eslint-disable-line new-cap
