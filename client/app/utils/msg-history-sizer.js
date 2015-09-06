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

'use strict';

export function calcMsgHistorySize() {
    const minLines = 40;
    const maxLines = 180;

    const lineHeight = 19;
    const screenHeight = $(window).height();

    let twoScreenfulls = Math.floor(screenHeight / lineHeight * 2);

    return Math.min(Math.max(twoScreenfulls, minLines), maxLines);
}
