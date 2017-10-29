import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import RegisterModal from '../../registerModal';
import styles from './index.css';

import screenshot from '../../../../screenshot.png';

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
            <main className={cx('main')}>
                <img className={cx('screenshot')} src={screenshot} />

                <div className={cx('slogan')}>
                    <span className={cx('title')}>
                        MeetAndSpeak&nbsp;
                    </span>
                    <span className={cx('subtitle')}>
                        - Next generation group chat tool
                    </span>
                    <a onClick={this.toggleRegisterModal} className={cx('register-button')}>
                        <span>
                            Register
                        </span>
                    </a>
                </div>
                <footer className={cx('footer')}>
                    <div className={cx('column', 'is-one-third')}>
                        <Link to="tos"> Privacy Policy and Terms of Service</Link>
                    </div>
                    <div className={cx('column', 'is-one-third')}>
                        Copyright &copy; 2017 MeetAndSpeak Ltd.
                    </div>
                    <div className={cx('column', 'is-one-third', 'has-text-centered')}>
                        <span className={cx('icon')}>
                            <a href="https://github.com/ilkkao/mas"><i className="fa fa-github" /></a>
                        </span>
                    </div>
                </footer>
                {registerModal}
            </main>
        );
    }
}

export default HomePage;
