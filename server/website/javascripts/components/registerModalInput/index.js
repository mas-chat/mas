import React, { Component } from 'react';
import { HOC } from 'formsy-react';

let idCounter = 0;

class RegisterModalInput extends Component {
    constructor(props) {
        super(props);

        this.changeValue = this.changeValue.bind(this);
    }

    componentWillMount() {
        this.setState({ id: `input-${idCounter++}` });
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
                    <input id={id} className={inputClass} type="text" value={value} autoFocus={this.props.autoFocus} autoComplete={this.props.autocomplete} onChange={this.changeValue} ref={(e) => ((this.props.focus && e) ? e.focus() : false)} />
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
    label: React.PropTypes.string.isRequired,
    autocomplete: React.PropTypes.string,
    autoFocus: React.PropTypes.bool,
    getErrorMessage: React.PropTypes.func, // formsy
    getValue: React.PropTypes.func, // formsy
    setValue: React.PropTypes.func, // formsy
    showError: React.PropTypes.func // formsy
};

export default HOC(RegisterModalInput); // eslint-disable-line new-cap
