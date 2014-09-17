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

Mas.UploadMixin = Ember.Mixin.create({
    upload: function(files, windowController) {
        if(files.length === 0) {
            return;
        }

        FileAPI.upload({
            url: '/api/v1/upload',
            files: { userFiles: files },
            progress: function() { /* ... */ },
            complete: function(err, xhr) {
                if (!err) {
                    var url = JSON.parse(xhr.responseText).url[0];
                    windowController.sendMessage(url);
                } else {
                    windowController.printLine('File upload failed.', 'error');
                }
            },
            data: {
                sessionId: Mas.networkMgr.sessionId,
            }
        });
    }
});
