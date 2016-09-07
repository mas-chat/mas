import React from 'react';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);

const AboutPage = () => (
    <main className={cx('m-main', 'container')}>
        <section>
            <h1 className={cx('m-title', 'title is-1')}>About</h1>
            <p className={cx('m-block', 'block')}>MeetAndSpeak is a web based chat tool. Source code is available at <a href="https://github.com/ilkkao/mas">Github</a></p>
        </section>
    </main>
);

export default AboutPage;
