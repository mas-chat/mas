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

import { next } from '@ember/runloop';
import { computed } from '@ember/object';
import { gt } from '@ember/object/computed';
import Component from '@ember/component';
import moment from 'moment';
import { dispatch } from '../../../utils/dispatcher';

export default Component.extend({
  classNames: ['flex-column', 'flex-1'],
  classNameBindings: ['enabled:visible:hidden'],

  loading: true,
  enabled: true,
  window: null,

  $dateInput: null,
  currentDate: null,

  // Temporary solution, pagination is coming
  tooManyMessages: gt('window.logMessages', 999),

  init() {
    this._super();

    this.set('currentDate', new Date());
  },

  friendlyDate: computed('currentDate', function() {
    return moment(this.currentDate).format('dddd, MMMM Do YYYY');
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

    this.$dateInput.datepicker().on('changeDate', () => {
      this.set('currentDate', this.$dateInput.datepicker('getDate'));
      this._fetchData();
    });

    this._seek(0);
  },

  _seek(days) {
    const newDate = moment(this.currentDate)
      .add(days, 'd')
      .toDate();

    this.set('currentDate', newDate);
    this.$dateInput.datepicker('update', newDate);

    this._fetchData();
  },

  _fetchData() {
    // Beginning and end of the selected day in unix time format
    const date = this.currentDate;
    const epochTsStart = moment(date)
      .startOf('day')
      .unix();
    const epochTsEnd = moment(date)
      .endOf('day')
      .unix();

    this.set('loading', true);

    dispatch('FETCH_MESSAGE_RANGE', {
      window: this.window,
      start: epochTsStart,
      end: epochTsEnd,
      successCB: () => {
        this.set('loading', false);
        this._loadImages();
      }
    });
  },

  _loadImages() {
    next(this, function() {
      this.$('img[data-src]').each(function() {
        const $img = $(this);
        $img.attr('src', $img.data('src'));
      });
    });
  }
});
