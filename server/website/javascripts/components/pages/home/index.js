import React, { Component } from 'react';
import classNames from 'classnames/bind';
import RegisterModal from '../../registerModal';
import styles from './index.css';

const cx = classNames.bind(styles);

class HomePage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            registerModalOpen: false
        };

        this.toggleRegisterModal = this.toggleRegisterModal.bind(this);
    }

    toggleRegisterModal() {
        this.setState({ registerModalOpen: !this.state.registerModalOpen });
    }

    render() {
        const registerModal = this.state.registerModalOpen ? <RegisterModal onHide={this.toggleRegisterModal} /> : null;

        return (
            <section className={cx('container')}>
                <div className="container has-text-centered">
                    <h1 className="title">
                        MAS
                    </h1>
                    <h2 className="subtitle">
                        A modern open source chat tool
                    </h2>
                    <a onClick={this.toggleRegisterModal} className="button is-primary">
                        <span>
                            Register
                        </span>
                    </a>
                </div>
                {registerModal}
            </section>
        );
    }
}

export default HomePage;
