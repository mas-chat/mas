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

import Ember from 'ember';

export default Ember.Service.extend({
    store: Ember.inject.service(),
    socket: Ember.inject.service(),

    dispatch(type, data = {}, acceptCb, rejectCb) {
        let name = type.split('_').map(part => part.toLowerCase().capitalize()).join('');
        let handler = `_handle${name}`;

        if (!this[handler]) {
            Ember.Logger.error(`Unknown action: ${type}`);
        } else {
            Ember.Logger.info(`[ACT] ${type}`);
            this[handler](data, acceptCb, rejectCb);
        }
    },

    _handleCloseAlert(data) {
        let callback = this.get('store.alerts').get('firstObject').get('resultCallback');

        if (callback) {
            callback(data.result);
        }

        this.get('store.alerts').shiftObject();
    },

    _handleUpdateWindowAlerts(data) {
        data.window.set('alerts', data.alerts);

        this.get('socket').send({
            id: 'UPDATE',
            windowId: data.window.get('windowId'),
            alerts: data.alerts
        });
    },

    _handleUploadFiles(data) {
        if (data.files.length === 0) {
            return;
        }

        let formData = new FormData();
        let files = Array.from(data.files);

        for (let file of files) {
            formData.append('file', file, file.name || 'webcam-upload.jpg');
        }

        formData.append('sessionId', this.get('socket').sessionId);

        $.ajax({
            url: '/api/v1/upload',
            type: 'POST',
            data: formData,
            dataType: 'json',
            processData: false,
            contentType: false,
            success: resp => this.dispatch('SEND_TEXT', {
                text: resp.url.join(' '),
                window: data.window
            }),
            error: () => this.dispatch('ADD_ERROR', {
                body: 'File upload failed.',
                window: data.window
            })
        });
    },

    _handleAddMessage(data) {
        this.get('store').upsertModel('message', {
            body: data.body,
            cat: 'msg',
            userId: this.get('store.userId'),
            ts: data.ts,
            gid: data.gid
        }, data.window);
    },

    _handleAddError(data) {
        this.get('store').upsertModel('message', {
            body: data.body,
            cat: 'error',
            userId: null,
            ts: moment().unix(),
            gid: 'error' // TODO: Not optimal, there's never second error message
        }, data.window);
    },

    _handleSendText(data) {
        this.get('socket').send({
            id: 'SEND',
            text: data.text,
            windowId: data.window.get('windowId')
        }, resp => {
            if (resp.status !== 'OK') {
                this.dispatch('OPEN_MODAL', {
                    name: 'info-modal',
                    model: {
                        title: 'Error',
                        body: resp.errorMsg
                    }
                });
            } else {
                this.dispatch('ADD_MESSAGE', {
                    body: data.text,
                    ts: resp.ts,
                    gid: resp.gid,
                    window: data.window
                });
            }
        });
    },

    _handleSendCommand(data) {
        this.get('socket').send({
            id: 'COMMAND',
            command: data.command,
            params: data.params,
            windowId: data.window.get('windowId')
        }, resp => {
            if (resp.status !== 'OK') {
                this.dispatch('OPEN_MODAL', {
                    name: 'info-modal',
                    model: {
                        title: 'Error',
                        body: resp.errorMsg
                    }
                });
            }
        });
        return;
    },

    _handleOpenModal(data) {
        this.get('store.modals').pushObject({
            name: data.name,
            model: data.model
        });
    },

    _handleCloseModal() {
        this.get('store.modals').shiftObject();
    },

    _handleOpenPriorityModal(data) {
        this.get('store.modals').unshiftObject({ // Show immediately
            name: data.name,
            model: data.model
        });
    },

    _handleClosePriorityModal() {
        this.get('store.modals').shiftObject();
    },

    _handleDestroyAccount() {
        this.get('socket').send({
            id: 'DESTROY_ACCOUNT'
        }, () => {
            $.removeCookie('auth', { path: '/' });
            window.location = '/';
        });
    },

    _handleCreateGroup(data, acceptCb, rejectCb) {
        this.get('socket').send({
            id: 'CREATE',
            name: data.name,
            password: data.password
        }, resp => {
            if (resp.status === 'OK') {
                acceptCb();
            } else {
                rejectCb(resp.errorMsg);
            }
        });
    },

    _handleJoinGroup(data, acceptCb, rejectCb) {
        this.get('socket').send({
            id: 'JOIN',
            name: data.name,
            network: 'MAS',
            password: data.password
        }, resp => {
            if (resp.status === 'OK') {
                acceptCb();
            } else {
                rejectCb(resp.errorMsg);
            }
        });
    },

    _handleJoinIrcChannel(data, acceptCb, rejectCb) {
        this.get('socket').send({
            id: 'JOIN',
            name: data.name,
            network: data.network,
            password: data.password
        }, resp => {
            if (resp.status === 'OK') {
                acceptCb();
            } else {
                rejectCb(resp.errorMsg);
            }
        });
    },

    _handleChangeWindowDesktop(data) {
        let desktop = data.desktop;
        let draggedWindow = this.get('store.activeDraggedWindow');

        if (draggedWindow) {
            console.log('jay')
            draggedWindow.set('desktop', desktop === 'new' ?
                Math.floor(new Date() / 1000) : parseInt(desktop));
        }
    },

    _handleChangeActiveDesktop(data) {
        this.get('store').changeDesktop(data.desktop);
    },

    _handleSeekActiveDesktop(data) {
        this.get('store').seekDesktop(data.direction);
    },

    _handleStartChat(data) {
        this.get('socket').send({
            id: 'CHAT',
            userId: data.userId
        }, resp  => {
            if (resp.status !== 'OK') {
                this.dispatch('OPEN_MODAL', {
                    name: 'info-modal',
                    model: {
                        title: 'Error',
                        body: resp.errorMsg
                    }
                });
            }
        });
    },

    _handleConfirmRemoveFriend(data) {
        this.dispatch('OPEN_MODAL', {
            name: 'remove-friend-modal',
            model: data.userId
        });
    },

    _handleFetchMessages(data, successCb) {
        this.get('socket').send({
            id: 'GET_CONVERSATION_LOG',
            windowId: data.window.get('windowId'),
            start: data.start,
            end: data.end
        }, resp => {
            this.get('store').clearModels('logMessage', data.window);

            for (let message of resp.results) {
                this.get('store').upsertModel('logMessage', message, data.window);
            }

            successCb();
        });
    },

    _handleProcessLine(data) {
        let body = data.body;
        let command = false;
        let commandParams;

        if (body.charAt(0) === '/') {
            let data = /^(\S*)(.*)/.exec(body.substring(1));
            command = data[1] ? data[1].toLowerCase() : '';
            commandParams = data[2] ? data[2] : '';
        }

        let ircServer1on1 = data.window.get('type') === '1on1' &&
            data.window.get('userId') === 'iSERVER';

        if (ircServer1on1 && !command) {
            this.dispatch('ADD_ERROR', {
                body: 'Only commands allowed, e.g. /whois john',
                window: window
            });
        }

        if (command === 'help') {
            this.dispatch('OPEN_MODAL', { name: 'help-modal' });
            return;
        }

        // TBD: /me on an empty IRC channel is not shown to the sender.

        if (command) {
            this.dispatch('SEND_COMMAND', {
                command: command,
                params: commandParams.trim(),
                window: data.window
            });
            return;
        }

        this.dispatch('SEND_TEXT', {
            text: body,
            window: data.window
        });
    },

    _handleEditMessage(data) {
        this.get('socket').send({
            id: 'EDIT',
            windowId: data.window.get('windowId'),
            gid: data.gid,
            text: data.body
        }, resp => {
            if (resp.status !== 'OK') {
                this.dispatch('OPEN_MODAL', {
                    name: 'info-modal',
                    model: {
                        title: 'Error',
                        body: resp.errorMsg
                    }
                });
            }
        });
    },

    _handleRequestFriend(data) {
        this.get('socket').send({
            id: 'REQUEST_FRIEND',
            userId: data.userId
        }, resp => {
            let message = resp.status === 'OK' ?
                'Request sent. Contact will added to your list when he or she approves.' :
                resp.errorMsg;

            this.get('store').upsertModel('alert', {
                alertId: `internal:${Date.now()}`,
                message: message,
                dismissible: true,
                report: false,
                postponeLabel: false,
                ackLabel: 'Okay'
            });
        });
    },

    _handleCloseWindow(data) {
        this.get('socket').send({
            id: 'CLOSE',
            windowId: data.window.get('windowId')
        });
    },

    _handleLogout() {
        this.get('socket').send({
            id: 'LOGOUT'
        }, () => {
            $.removeCookie('auth', { path: '/' });

            if (typeof Storage !== 'undefined') {
                window.localStorage.removeItem('data');
            }

            window.location = '/';
        });
    },

    _handleToggleTheme() {
        let newTheme = this.get('store.settings.theme') === 'dark' ? 'default' : 'dark';

        this.set('store.settings.theme', newTheme);
        this.get('socket').send({
            id: 'SET',
            settings: {
                theme: newTheme
            }
        });
    },

    _handleUpdatePassword(data, successCb, rejectCb) {
        this.get('socket').send({
            id: 'UPDATE_PASSWORD',
            windowId: data.window.get('windowId'),
            password: data.password
        }, resp => {
            if (resp.status === 'OK') {
                successCb();
            } else {
                rejectCb(resp.errorMsg);
            }
        });
    },

    _handleUpdateProfile(data, successCb, rejectCb) {
        this.get('socket').send({
            id: 'UPDATE_PROFILE',
            name: data.name,
            email: data.email
        }, resp => {
            if (resp.status === 'OK') {
                // Don't nag about unconfirmed email address anymore in this session
                this.set('store.settings.emailConfirmed', true);
                successCb();
            } else {
                rejectCb(resp.errorMsg);
            }
        });
    },

    _handleFetchProfile(data) {
        this.get('socket').send({
            id: 'GET_PROFILE'
        }, resp => {
            this.set('store.profile.name', resp.name);
            this.set('store.profile.email', resp.email);
            this.set('store.profile.nick', resp.nick);
        });
    },

    _handleRemoveFriend(data) {
        this.get('socket').send({
            id: 'REMOVE_FRIEND',
            userId: data.userId
        });
    },

    _handleUpdateTopic(data) {
        this.get('socket').send({
            id: 'UPDATE_TOPIC',
            windowId: data.window.get('windowId'),
            topic: data.topic
        });
    },

    _handleConfirmEmail(data, successCb, rejectCb) {
        this.get('socket').send({
            id: 'SEND_CONFIRM_EMAIL'
        }, () => {
            this.get('store').upsertModel('alert', {
                message: 'Confirmation link sent. Check your spam folder if you don\'t see it in inbox.',
                dismissible: true,
                report: false,
                postponeLabel: false,
                ackLabel: 'Okay'
            });

            this.set('store.emailConfirmed', true);
        });
    }
});
