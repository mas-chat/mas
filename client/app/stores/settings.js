//
//   Copyright 2009-2015 Ilkka Oksanen <iao@iki.fi>
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing,
//   software distributed under the License is distributed on an "AS
//   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//   express or implied.  See the License for the specific language
//   governing permissions and limitations under the License.
//

import isMobile from 'npm:ismobilejs';
import Store from 'emflux/store';
import { dispatch } from 'emflux/dispatcher';
import socket from '../utils/socket';

export default Store.extend({
    theme: 'default',
    activeDesktop: 1,
    email: '', // TODO: Remove from here, keep in profile
    emailConfirmed: true,
    canUseIRC: false,

    toJSON() {
        return {
            version: 1,
            activeDesktop: this.get('activeDesktop')
        };
    },

    fromJSON(data) {
        if (data.version !== 1) {
            return;
        }

        this.set('activeDesktop', data.activeDesktop);
    },

    handleToggleTheme() {
        let newTheme = this.get('theme') === 'dark' ? 'default' : 'dark';

        this.set('theme', newTheme);
        socket.send({
            id: 'SET',
            settings: {
                theme: newTheme
            }
        });
    },

    handleConfirmEmail() {
        const msg = 'Confirmation link sent. Check your spam folder if you don\'t see it in inbox.';

        socket.send({
            id: 'SEND_CONFIRM_EMAIL'
        }, () => {
            dispatch('SHOW_ALERT', {
                alertId: `client-${Date.now()}`,
                message: msg,
                postponeLabel: false,
                ackLabel: 'Okay',
                resultCallback: () => this.set('emailConfirmed', true)
            });
        });
    },

    handleSetEmailConfirmed() {
        this.set('emailConfirmed', true);
    },

    handleChangeActiveDesktop(data) {
        this.set('activeDesktop', data.desktop);

        if (!isMobile.any) {
            socket.send({
                id: 'SET',
                settings: {
                    activeDesktop: data.desktop
                }
            });
        }
    },

    handleUpdateSettingsServer(data) {
        if (isMobile.any) {
            delete data.settings.activeDesktop;
        }

        this.setProperties(data.settings);
    }
});
