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

Ember.Handlebars.helper('decoratedTimestamp', function(timestamp) {
    return new Handlebars.SafeString(moment.unix(timestamp).format('HH:mm'));
});

Ember.Handlebars.helper('decoratedTitle', function(name, network, type) {
    var title;

    if (type === '1on1') {
        var conversationNetwork = network === 'MeetAndSpeak' ? '' : network + ' ';
        title = 'Private ' + conversationNetwork + 'conversation with ' + name;
    } else if (network === 'MeetAndSpeak') {
        title = 'Group: ' + name;
    } else {
        title = network + ' channel: ' + name;
    }

    return new Handlebars.SafeString(title);
});