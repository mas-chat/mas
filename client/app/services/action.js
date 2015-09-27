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

    dispatch(type, data = {}, options = {}) {
        let name = type.split('_').map(part => part.toLowerCase().capitalize()).join('');
        let handler = `_handle${name}`;

        if (!this[handler]) {
            Ember.Logger.error(`Unknown action: ${type}`);
        } else {
            Ember.Logger.info(`[ACT] ${type}`);
            this[handler](data, options);
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
        data.window.set('alerts', alerts);

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
                this.get('action').dispatch('OPEN_MODAL', {
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
    }
});
