//
//   Copyright 2009-2016 Ilkka Oksanen <iao@iki.fi>
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

const Model = require('./model'),
      UserGId = require('./userGId');

module.exports = class ConversationMember extends Model {
    get gId() {
        if (!this._gId) {
            this._gId = UserGId.create(this.get('userGId'));
        }

        return this._gId;
    }

    get gIdString() {
        if (!this._gIdString) {
            this._gIdString = this.gId.toString();
        }

        return this._gIdString;
    }
};
