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

'use strict';

/* globals moment, $ */

import Ember from 'ember';

export default Ember.Component.extend({
    classNames: [ 'flex-column', 'flex-1' ],
    classNameBindings: [ 'enabled:visible:hidden' ],

    socket: Ember.inject.service(),
    store: Ember.inject.service(),

    loading: true,
    enabled: true,
    window: null,

    $dateInput: null,
    currentDate: null,
    tooManyMessages: false, // Temporary solution, pagination is coming

    init() {
        this._super();

        this.set('currentDate', new Date());
    },

    friendlyDate: Ember.computed('currentDate', function() {
        return moment(this.get('currentDate')).format('dddd, MMMM Do YYYY');
    }),

    actions: {
        nextDay() {
            this._seek(1);
        },

        previousDay() {
            this._seek(-1);
        },

        exit() {
            this.set('enabled', false);
            this.sendAction('compress');
        }
    },

    didInsertElement() {
        this.$().velocity('slideDown', {
            duration: 700,
            easing: 'easeInOutQuad',
            display: 'flex'
        });

        this.$dateInput = this.$('.logs-date');

        this.$dateInput.datepicker({
            autoclose: true,
            todayHighlight: true,
            weekStart: 1
        });

        this.$dateInput.datepicker().on('changeDate', function() {
            this.set('currentDate', this.$dateInput.datepicker('getDate'));
            this._fetchData();
        }.bind(this));

        this._seek(0);
    },

    _seek(days) {
        let newDate = moment(this.get('currentDate')).add(days, 'd').toDate();

        this.set('currentDate', newDate);
        this.$dateInput.datepicker('update', newDate);

        this._fetchData();
    },

    _fetchData() {
        // Beginning and end of the selected day in unix time format
        let date = this.get('currentDate');
        let epochTsStart = moment(date).startOf('day').unix();
        let epochTsEnd = moment(date).endOf('day').unix();

        this.set('loading', true);

        this.get('socket').send({
            id: 'GET_CONVERSATION_LOG',
            windowId: this.get('window.windowId'),
            start: epochTsStart,
            end: epochTsEnd
        }, function(resp) {
            this.get('window.logMessages').clear();
            this.set('loading', false);
            // TBD: Temporary check, implement pagination
            this.set('tooManyMessages', resp.results.length > 999);

            resp.results.forEach(function(message) {
                this.get('store').upsertObject('logMessage', message, this.get('window'));
            }.bind(this));

            this._loadImages();
        }.bind(this));
    },

    _loadImages() {
        Ember.run.next(this, function() {
            this.$('img[data-src]').each(function() {
                let $img = $(this);
                $img.attr('src', $img.data('src')).one('load error', function() {
                    $img.removeClass('loader loader-small-dark');
                });
            });
        });
    }
});
