import React, { Component } from 'react';
import { HOC } from 'formsy-react';

let idCounter = 0;

class RegisterModalPassword extends Component {
    constructor(props) {
        super(props);

        this.changeValue = this.changeValue.bind(this);
    }

    componentWillMount() {
        this.setState({ id: `checkbox-${idCounter++}` });
    }

    changeValue(event) {
        this.props.setValue(event.currentTarget.value);
    }

    render() {
        const error = this.props.showError();
        const errorMessage = this.props.getErrorMessage();
        const inputClass = `input ${error ? 'is-danger' : 'is-success'}`;
        const value = this.props.getValue();
        const id = this.state.id;
        let icon = null;

        if (error && value) {
            icon = <i className="fa fa-warning" />;
        } else if (value) {
            icon = <i className="fa fa-check" />;
        }

        return (
            <span>
                <label htmlFor={id} className="label">{this.props.label}</label>
                <p className="control has-icon has-icon-right">
                    <input id={id} className={inputClass} type="password" value={value} autoComplete={this.props.autocomplete} onChange={this.changeValue} />
                    {icon}
                    {this.props.showErrorMessage ? <span className="help is-danger">{errorMessage}</span> : null}
                </p>
            </span>
        );
    }
}

RegisterModalPassword.propTypes = {
    showErrorMessage: React.PropTypes.bool,
    label: React.PropTypes.string.isRequired,
    autocomplete: React.PropTypes.string,
    getErrorMessage: React.PropTypes.func.isRequired, // formsy
    getValue: React.PropTypes.func.isRequired, // formsy
    setValue: React.PropTypes.func.isRequired, // formsy
    showError: React.PropTypes.func.isRequired // formsy
};

RegisterModalPassword.defaultProps = {
    showErrorMessage: false,
    autocomplete: false
};

export default HOC(RegisterModalPassword); // eslint-disable-line new-cap
