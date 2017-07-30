import React from 'react';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);

const AboutPage = () => (
    <main className={cx('main')}>
        <h1 className={cx('plans', 'title', 'is-2')}>
            About
        </h1>
        <p>
            MeetAndSpeak was born of the need for a Web chat tool with a user interface similar to that of native <a href="http://en.wikipedia.org/wiki/IRC">IRC</a> clients.
        </p>
        <p>
            From the beginning, the idea has been to provide a group chat service with superb user
            experience. No more, no less. The service is not targeted
            at any particular type of user, yet it has been carefully designed with flexibility to meet a broad range of needs, from those of small hobby groups to projects at companies.
        </p>
        <p>
            MeetAndSpeak service is run by MeetAndSpeak Ltd. (business ID 2336555-5), a privately owned company located at Espoo, Finland.
        </p>
        <p>
            We love open source. A free open source version of MeetAndSpeak is available at <a href="https://github.com/ilkkao/mas">Github</a>
        </p>
    </main>
);

export default AboutPage;
