import React from 'react';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);

const SupportPage = () => (
    <main className={cx('main')}>
        <h1 className={cx('headline')}>
            Support
        </h1>
        <p>
            You can e-mail your questions directly to <a href="mailto:support@meetandspeak.com">support@meetandspeak.com</a>
        </p>
    </main>
);

export default SupportPage;
