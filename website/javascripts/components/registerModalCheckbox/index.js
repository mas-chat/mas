import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withFormsy } from 'formsy-react';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);
let idCounter = 0;

class RegisterModalCheckbox extends Component {
  constructor(props) {
    super(props);

    this.state = { id: `checkbox-${idCounter++}` };
    this.changeValue = this.changeValue.bind(this);
  }

  changeValue(event) {
    this.props.setValue(event.currentTarget.checked);
  }

  render() {
    const value = this.props.value;
    const id = this.state.id;

    return (
      <span>
        <p className={cx('m-wrapper', 'control')}>
          <label htmlFor={id} className="checkbox">
            <input id={id} className={cx('tos')} type="checkbox" value={this.props.value} onChange={this.changeValue} />
            {this.props.label}
          </label>
        </p>
      </span>
    );
  }
}

RegisterModalCheckbox.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.bool, // formsy
  setValue: PropTypes.func.isRequired // formsy
};

RegisterModalCheckbox.defaultProps = {
  value: false
};

export default withFormsy(RegisterModalCheckbox); // eslint-disable-line new-cap
