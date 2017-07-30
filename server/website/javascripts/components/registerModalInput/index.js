import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { HOC } from 'formsy-react';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);

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
        const inputClass = cx('input', error ? 'is-danger' : 'is-success');
        const value = this.props.getValue();
        const id = this.state.id;
        let icon = null;

        if (error && value) {
            icon = <i className={cx('fa', 'fa fa-warning')} />;
        } else if (value) {
            icon = <i className={cx('fa', 'fa fa-check')} />;
        }

        return (
            <span>
                <label htmlFor={id} className={cx('label')}>{this.props.label}</label>
                <p className={cx('control', 'has-icon')}>
                    <input id={id} className={inputClass} type="text" value={value} autoFocus={this.props.autoFocus} autoComplete={this.props.autocomplete} onChange={this.changeValue} ref={(e) => ((this.props.focus && e) ? e.focus() : false)} />
                    {icon}
                    {this.props.showErrorMessage ? <span className={cx('help', 'is-danger')}>{errorMessage}</span> : null}
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
    getErrorMessage: PropTypes.func.isRequired, // formsy
    getValue: PropTypes.func.isRequired, // formsy
    setValue: PropTypes.func.isRequired, // formsy
    showError: PropTypes.func.isRequired // formsy
};

RegisterModalInput.defaultProps = {
    focus: false,
    autocomplete: false,
    autoFocus: false
};

export default HOC(RegisterModalInput); // eslint-disable-line new-cap
