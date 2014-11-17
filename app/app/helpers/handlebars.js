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

import Ember from 'ember';
import moment from 'moment';

Ember.Handlebars.helper('decoratedTimestamp', function(timestamp) {
    var ts = moment.unix(timestamp);

    return new Handlebars.SafeString('<div class="timestamp" data-toggle="tooltip" title="' +
        ts.format('ddd, MMM D') + '">' + ts.format('HH:mm') + '</div>');
});

Ember.Handlebars.helper('dayDivider', function(list, index) {
    var dateForCurrent = moment.unix(list[index].get('ts'));
    var dateForPrevious = index === 0 ? null : moment.unix(list[index - 1].get('ts'));

    if (index === 0 || dateForCurrent.format('l') !== dateForPrevious.format('l')) {
        return new Handlebars.SafeString(
            '<div class="date-divider">' + dateForCurrent.format('dddd, MMMM D, YYYY') + '</div>');
    }
});

Ember.Handlebars.helper('timeSince', function(online, timeStamp) {
    var res;

    if (online) {
        res = '';
    } else if (timeStamp === -1) {
        res = 'never';
    } else {
        res = moment.unix(timeStamp).fromNow(true);
    }

    return new Handlebars.SafeString(res);
});
