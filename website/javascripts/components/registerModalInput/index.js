import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withFormsy } from 'formsy-react';

let idCounter = 0;

class RegisterModalInput extends Component {
  constructor(props) {
    super(props);

    this.state = { id: `input-${idCounter++}` };
    this.changeValue = this.changeValue.bind(this);
  }

  changeValue(event) {
    this.props.setValue(event.currentTarget.value);
  }

  render() {
    const error = this.props.showError;
    const errorMessage = this.props.errorMessage;
    const inputClass = `input ${error ? 'is-danger' : 'is-success'}`;
    const value = this.props.value;
    const id = this.state.id;
    let icon = null;

    if (error && value) {
      icon = <i className="fa fa-warning" />;
    } else if (value) {
      icon = <i className="fa fa-check" />;
    }

    return (
      <span>
        <label htmlFor={id} className="label">
          {this.props.label}
        </label>
        <p className="control has-icon has-icon-right">
          <input
            id={id}
            className={inputClass}
            type="text"
            value={value}
            autoFocus={this.props.autoFocus}
            autoComplete={this.props.autocomplete}
            onChange={this.changeValue}
            ref={e => (this.props.focus && e ? e.focus() : false)}
          />
          {icon}
          {this.props.showErrorMessage ? <span className="help is-danger">{errorMessage}</span> : null}
        </p>
      </span>
    );
  }
}

RegisterModalInput.propTypes = {
  focus: PropTypes.bool,
  showErrorMessage: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  autocomplete: PropTypes.string,
  autoFocus: PropTypes.bool,
  errorMessage: PropTypes.string, // formsy
  value: PropTypes.string, // formsy
  setValue: PropTypes.func.isRequired, // formsy
  showError: PropTypes.bool.isRequired // formsy
};

RegisterModalInput.defaultProps = {
  value: '',
  focus: false,
  autocomplete: false,
  autoFocus: false
};

export default withFormsy(RegisterModalInput); // eslint-disable-line new-cap
