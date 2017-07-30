import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { HOC } from 'formsy-react';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);
let idCounter = 0;

class RegisterModalCheckbox extends Component {
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
        const value = this.props.getValue();
        const id = this.state.id;

        return (
            <span>
                <p className={cx('wrapper')}>
                    <label htmlFor={id} className={cx('checkbox')}>
                        <input id={id} className={cx('tos')} type="checkbox" value={value} onChange={this.changeValue} />
                        {this.props.label}
                    </label>
                </p>
            </span>
        );
    }
}

RegisterModalCheckbox.propTypes = {
    label: PropTypes.string.isRequired,
    getValue: PropTypes.func.isRequired, // formsy
    setValue: PropTypes.func.isRequired // formsy
};

export default HOC(RegisterModalCheckbox); // eslint-disable-line new-cap
