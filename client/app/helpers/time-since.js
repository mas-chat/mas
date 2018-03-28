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

import Helper from '@ember/component/helper';
import moment from 'npm:moment';

export default Helper.extend({
    compute(params) {
        let online = params[0];
        let timeStamp = params[1];
        let dateString;

        if (online) {
            dateString = '';
        } else if (timeStamp === -1) {
            dateString = 'never';
        } else {
            dateString = moment.unix(timeStamp).fromNow(true);
        }

        return dateString;
    }
});
