import React, { Component } from 'react';
import { HOC } from 'formsy-react';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);

class RegisterModalCheckbox extends Component {
    constructor(props) {
        super(props);

        this.changeValue = this.changeValue.bind(this);
    }

    changeValue(event) {
        this.props.setValue(event.currentTarget.value);
    }

    render() {
        const value = this.props.getValue();

        return (
            <span>
                <p className={`${cx('wrapper')} control`}>
                    <label className="checkbox">
                        <input className={cx('checkbox')} type="checkbox" value={value} onChange={this.changeValue} />
                        {this.props.label}
                    </label>
                </p>
            </span>
        );
    }
}

RegisterModalCheckbox.propTypes = {
    label: React.PropTypes.string.isRequired
};

export default HOC(RegisterModalCheckbox); // eslint-disable-line new-cap
