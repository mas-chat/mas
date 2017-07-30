import React from 'react';
import classNames from 'classnames/bind';
import styles from './index.css';

const cx = classNames.bind(styles);

const PricingPage = () => (
    <main className={cx('main')}>
        <h1 className={cx('plans', 'title', 'is-2')}>
            Plans
        </h1>
        <div className={cx('plans')}>
            <div className={cx('plan')}>
                <div className={cx('plan-title')}>
                    FREE
                </div>
                <div className={cx('plan-price')}>
                    $0 / month
                </div>
                <div className={cx('plan-divider')} />
                <div className={cx('plan-item')}>
                    Join to unlimited existing chat groups
                </div>
                <div className={cx('plan-divider')} />
                <div className={cx('plan-item')}>
                    Create one own chat group
                </div>
                <div className={cx('plan-divider')} />
                <div className={cx('plan-item')}>
                    One week conversation history
                </div>
                <div className={cx('plan-divider')} />
                <div className={cx('plan-item')}>
                    5 MB storage for attached images and other content
                </div>
            </div>
            <div className={cx('plan')}>
                <div className={cx('plan-title')}>
                    PREMIUM
                </div>
                <div className={cx('plan-price')}>
                    $2.99 / month
                </div>
                <div className={cx('plan-divider')} />
                <div className={cx('plan-item')}>
                    Join to unlimited existing chat groups
                </div>
                <div className={cx('plan-divider')} />
                <div className={cx('plan-item')}>
                    Create up-to 20 own chat groups
                </div>
                <div className={cx('plan-divider')} />
                <div className={cx('plan-item')}>
                    One year conversation history
                </div>
                <div className={cx('plan-divider')} />
                <div className={cx('plan-item')}>
                    100 MB storage for attached images and other content
                </div>
                <div className={cx('plan-divider')} />
                <div className={cx('plan-item')}>
                    <a href="https://en.wikipedia.org/wiki/Internet_Relay_Chat">IRC</a> connectivity
                </div>
            </div>
        </div>
    </main>
);

export default PricingPage;
