//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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

/* globals $ */

import Ember from 'ember';
import moment from 'npm:moment';
import Cookies from 'npm:js-cookie';
import isMobile from 'npm:ismobilejs';
import Store from 'emflux/store';
import { dispatch, getStore } from 'emflux/dispatcher';
import Window from '../models/window';
import IndexArray from '../utils/index-array';
import socket from '../utils/socket';
import { calcMsgHistorySize } from '../utils/msg-history-sizer';

export default Store.extend({
    windows: IndexArray.create({ index: 'windowId', factory: Window }),
    msgBuffer: null, // Only used during startup
    maxBacklogMsgs: 100000,
    cachedUpto: 0,

    // TODO: Re-factor leftovers
    userId: null,
    secret: null,

    initDone: false,

    init() {
        this._super();

        let [ userId, secret ] = (Cookies.get('auth') || '').split('-');

        if (!userId || !secret) {
            Ember.Logger.info(`Authentication cookie not found. Exiting.`);
            this._logout({ informServer: false });
        } else {
            this.set('userId', userId);
            this.set('secret', secret);

            this.msgBuffer = [];
        }
    },

    desktops: Ember.computed('windows.@each.desktop', 'windows.@each.newMessagesCount', function() {
        let desktops = {};
        let desktopsArray = Ember.A([]);

        this.get('windows').forEach(function(masWindow) {
            let newMessages = masWindow.get('newMessagesCount');
            let desktop = masWindow.get('desktop');
            let initials = masWindow.get('simplifiedName').substr(0, 2).toUpperCase();

            if (desktops[desktop]) {
                desktops[desktop].messages += newMessages;
            } else {
                desktops[desktop] = { messages: newMessages, initials: initials };
            }
        });

        Object.keys(desktops).forEach(function(desktop) {
            desktopsArray.push({
                id: parseInt(desktop),
                initials: desktops[desktop].initials,
                messages: desktops[desktop].messages
            });
        });

        return desktopsArray;
    }),

    deletedDesktopCheck: Ember.observer('desktops.[]', 'initDone', function() {
        if (!this.get('initDone')) {
            return;
        }

        let desktopIds = this.get('desktops').map(d => d.id);

        if (desktopIds.indexOf(getStore('settings').get('activeDesktop')) === -1) {
            dispatch('CHANGE_ACTIVE_DESKTOP', {
                desktop: this.get('desktops').map(d => d.id).sort()[0] // Oldest
            });
        }
    }),

    toJSON() {
        let data = {
            version: 2,
            windows: [],
            userId: this.get('userId'),
            cachedUpto: 0
        };

        let maxBacklogMsgs = calcMsgHistorySize();

        this.get('windows').forEach(function(masWindow) {
            let messages = [];

            let sortedMessages = masWindow.get('messages').sortBy('ts').slice(-1 * maxBacklogMsgs);

            sortedMessages.forEach(function(message) {
                let messageData = message.getProperties([
                    'gid',
                    'body',
                    'cat',
                    'ts',
                    'updatedTs',
                    'userId',
                    'status',
                    'type',
                    'hideImages'
                ]);

                if (messageData.gid > data.cachedUpto) {
                    data.cachedUpto = messageData.gid;
                }

                if (!messageData.status || messageData.status === 'original') {
                    // Save space
                    delete messageData.status;
                    delete messageData.updatedTs;
                }

                messages.push(messageData);
            });

            let windowProperties = masWindow.getProperties([
                'windowId',
                'generation',
                'name',
                'userId',
                'network',
                'type',
                'row',
                'column',
                'desktop',
                'newMessagesCount',
                'minimizedNamesList',
                'alerts'
            ]);

            windowProperties.messages = messages;
            data.windows.push(windowProperties);
        });

        this.set('cachedUpto', data.cachedUpto);

        return data;
    },

    fromJSON(data) {
        if (data.version !== 2) {
            return;
        }

        for (let windowData of data.windows) {
            let messages = windowData.messages;
            delete windowData.messages;

            let windowModel = this.get('windows').upsertModel(windowData);
            windowModel.get('messages').upsertModels(messages, { window: windowModel });
        }

        this.set('cachedUpto', data.cachedUpto);
    },

    handleUploadFiles(data) {
        if (data.files.length === 0) {
            return;
        }

        let formData = new FormData();
        let files = Array.from(data.files);

        for (let file of files) {
            formData.append('file', file, file.name || 'webcam-upload.jpg');
        }

        formData.append('sessionId', socket.get('sessionId'));

        $.ajax({
            url: '/api/v1/upload',
            type: 'POST',
            data: formData,
            dataType: 'json',
            processData: false,
            contentType: false,
            success: resp => dispatch('SEND_TEXT', {
                text: resp.url.join(' '),
                window: data.window
            }),
            error: () => dispatch('ADD_ERROR', {
                body: 'File upload failed.',
                window: data.window
            })
        });
    },

    handleAddMessage(data) {
        data.window.messages.upsertModel({
            body: data.body,
            cat: 'msg',
            userId: this.get('userId'),
            ts: data.ts,
            gid: data.gid,
            window: data.window
        });
    },

    handleAddMessageServer(data) {
        data.window = this._getWindow(data.windowId);
        delete window.windowId;

        if (!this.get('initDone')) {
            // Optimization: Avoid re-renders after every message
            this.msgBuffer.push(data);
        } else {
            data.window.messages.upsertModel(data);
        }

        return true;
    },

    handleAddError(data) {
        data.window.messages.upsertModel({
            body: data.body,
            cat: 'error',
            userId: null,
            ts: moment().unix(),
            gid: 'error', // TODO: Not optimal, there's never second error message
            window: data.window
        });
    },

    handleSendText(data) {
        socket.send({
            id: 'SEND',
            text: data.text,
            windowId: data.window.get('windowId')
        }, resp => {
            if (resp.status !== 'OK') {
                dispatch('OPEN_MODAL', {
                    name: 'info-modal',
                    model: {
                        title: 'Error',
                        body: resp.errorMsg
                    }
                });
            } else {
                dispatch('ADD_MESSAGE', {
                    body: data.text,
                    ts: resp.ts,
                    gid: resp.gid,
                    window: data.window
                });
            }
        });
    },

    handleSendCommand(data) {
        socket.send({
            id: 'COMMAND',
            command: data.command,
            params: data.params,
            windowId: data.window.get('windowId')
        }, resp => {
            if (resp.status !== 'OK') {
                dispatch('OPEN_MODAL', {
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

    handleCreateGroup(data, acceptCb, rejectCb) {
        socket.send({
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

    handleJoinGroup(data, acceptCb, rejectCb) {
        socket.send({
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

    handleJoinIrcChannel(data, acceptCb, rejectCb) {
        socket.send({
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

    handleStartChat(data) {
        socket.send({
            id: 'CHAT',
            userId: data.userId,
            network: data.network
        }, resp  => {
            if (resp.status !== 'OK') {
                dispatch('OPEN_MODAL', {
                    name: 'info-modal',
                    model: {
                        title: 'Error',
                        body: resp.errorMsg
                    }
                });
            }
        });
    },

    handleFetchMessageRange(data, successCb) {
        socket.send({
            id: 'FETCH',
            windowId: data.window.get('windowId'),
            start: data.start,
            end: data.end
        }, resp => {
            data.window.get('logMessages').clearModels();
            data.window.get('logMessages').upsertModels(resp.msgs, { window: data.window });
            successCb();
        });
    },

    handleFetchOlderMessages(data, successCb) {
        socket.send({
            id: 'FETCH',
            windowId: data.window.get('windowId'),
            end: data.window.get('messages').sortBy('ts').get('firstObject').get('ts'),
            limit: 1000
        }, resp => {
            // Window messages are roughly sorted. First are old messages received by FETCH.
            // Then the messages received at startup and at runtime.
            data.window.get('messages').upsertModelsPrepend(resp.msgs, { window: data.window });

            successCb(resp.msgs.length !== 0);
        });
    },

    handleProcessLine(data) {
        let body = data.body;
        let command = false;
        let commandParams;

        if (body.charAt(0) === '/') {
            let data = /^(\S*)(.*)/.exec(body.substring(1));
            command = data[1] ? data[1].toLowerCase() : '';
            commandParams = data[2] ? data[2] : '';
        }

        let ircServer1on1 = data.window.get('type') === '1on1' &&
            data.window.get('userId') === 'i0';

        if (ircServer1on1 && !command) {
            dispatch('ADD_ERROR', {
                body: 'Only commands allowed, e.g. /whois john',
                window: data.window
            });
            return;
        }

        if (command === 'help') {
            dispatch('OPEN_MODAL', { name: 'help-modal' });
            return;
        }

        // TODO: /me on an empty IRC channel is not shown to the sender.

        if (command) {
            dispatch('SEND_COMMAND', {
                command: command,
                params: commandParams.trim(),
                window: data.window
            });
            return;
        }

        dispatch('SEND_TEXT', {
            text: body,
            window: data.window
        });
    },

    handleEditMessage(data) {
        socket.send({
            id: 'EDIT',
            windowId: data.window.get('windowId'),
            gid: data.gid,
            text: data.body
        }, resp => {
            if (resp.status !== 'OK') {
                dispatch('OPEN_MODAL', {
                    name: 'info-modal',
                    model: {
                        title: 'Error',
                        body: resp.errorMsg
                    }
                });
            }
        });
    },

    handleAddWindowServer(data) {
        this.get('windows').upsertModel(data, { generation: socket.sessionId });
    },

    handleCloseWindow(data) {
        socket.send({
            id: 'CLOSE',
            windowId: data.window.get('windowId')
        });
    },

    handleUpdateWindowServer(data) {
        let window = this._getWindow(data.windowId);
        window.setModelProperties(data);
    },

    handleDeleteWindowServer(data) {
        let window = this._getWindow(data.windowId);
        this.get('windows').removeModel(window);
    },

    handleUpdatePassword(data, successCb, rejectCb) {
        socket.send({
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

    handleUpdateTopic(data) {
        socket.send({
            id: 'UPDATE_TOPIC',
            windowId: data.window.get('windowId'),
            topic: data.topic
        });
    },

    handleUpdateWindowAlerts(data) {
        data.window.set('alerts', data.alerts);

        socket.send({
            id: 'UPDATE',
            windowId: data.window.get('windowId'),
            alerts: data.alerts
        });
    },

    handleMoveWindow(data) {
        let props = [ 'column', 'row', 'desktop' ];

        for (let prop of props) {
            if (data.hasOwnProperty(prop)) {
                data.window.set(prop, data[prop]);
            }
        }

        if (!isMobile.any) {
            socket.send({
                id: 'UPDATE',
                windowId: data.window.get('windowId'),
                desktop: data.desktop,
                column: data.column,
                row: data.row
            });
        }
    },

    handleToggleMemberListWidth(data) {
        let newValue = data.window.toggleProperty('minimizedNamesList');

        socket.send({
            id: 'UPDATE',
            windowId: data.window.get('windowId'),
            minimizedNamesList: newValue
        });
    },

    handleSeekActiveDesktop(data) {
        let desktops = this.get('desktops');
        let activeDesktop = getStore('settings').get('activeDesktop');
        let index = desktops.indexOf(desktops.findBy('id', activeDesktop));

        index += data.direction;

        if (index === desktops.length) {
            index = 0;
        } else if (index < 0) {
            index = desktops.length - 1;
        }

        dispatch('CHANGE_ACTIVE_DESKTOP', {
            desktop: desktops[index].id
        });
    },

    handleFinishStartupServer() {
        // Remove possible deleted windows.
        let deletedWindows = [];

        this.get('windows').forEach(windowObject => {
            if (windowObject.get('generation') !== socket.sessionId) {
                deletedWindows.push(windowObject);
            }
        });

        this.get('windows').removeModels(deletedWindows);

        // Insert buffered message in one go.
        Ember.Logger.info(`MsgBuffer processing started.`);

        for (let i = 0; i < this.msgBuffer.length; i++) {
            let item = this.msgBuffer[i];
            item.window.messages.upsertModel(item);
        }

        Ember.Logger.info(`MsgBuffer processing ended.`);

        this.msgBuffer = [];
        this.set('initDone', true);
    },

    handleAddMembersServer(data) {
        let window = this._getWindow(data.windowId);

        if (data.reset) {
            window.operators.clear();
            window.voices.clear();
            window.users.clear();
        }

        data.members.forEach(member => {
            let userId = member.userId;

            if (!data.reset) {
                this._removeUser(userId, window);
            }

            switch (member.role) {
                case '@':
                    window.operators.pushObject(userId);
                    break;
                case '+':
                    window.voices.pushObject(userId);
                    break;
                default:
                    window.users.pushObject(userId);
                    break;
            }
        });
    },

    handleDeleteMembersServer(data) {
        let window = this._getWindow(data.windowId);

        data.members.forEach(member => {
            this._removeUser(member.userId, window);
        });
    },

    // TODO: Move these handlers somewhere else

    handleLogout() {
        this._logout({ informServer: true });
    },

    handleDestroyAccount() {
        socket.send({
            id: 'DESTROY_ACCOUNT'
        }, () => {
            Cookies.remove('auth', { path: '/' });
            window.location = '/';
        });
    },

    _removeUser(userId, window) {
        window.operators.removeObject(userId);
        window.voices.removeObject(userId);
        window.users.removeObject(userId);
    },

    _getWindow(windowId) {
        return this.get('windows').getByIndex(windowId);
    },

    _logout({ informServer = false } = {}) {
        Cookies.remove('auth', { path: '/' });

        if (typeof Storage !== 'undefined') {
            window.localStorage.removeItem('data');
        }

        function exit() {
            window.location = '/';
        }

        if (informServer) {
            socket.send({
                id: 'LOGOUT'
            }, exit);
        } else {
            exit();
        }
    }
});
