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

export theme = ```

body {
    font-family: monospace;
    background-color: #333;
}

.window {
    background-color: #333;
    font-size: 12px;
}

.window .window-content, .window.private-1on1 .window-content {
    background-color: black;
}

.window .timestamp {
    margin-right: 8px;
}

.window .window-messages {
    color: #A5A5A5;
}

.window .line.day-divider .body {
    background-color: #1D2F1E;
    color: #AFAFAF;
}

.window .nick::before {
    content: "<";
}

.window .nick::after {
    content: ">";
}

.window .window-toolbar .form-control {
    background-color: black;
}

.window .window-add-text-container textarea:focus {
    background-color: #222;
    color: #CDCDCE;
}

.window .window-toolbar {
    border-top: 1px solid #A5A5A5;
}

.window .window-toolbar .btn, .window .window-buttons.flex-row {
    background-color: #222;
}

.window .window-members .gravatar {
    opacity: 0.3;
}

.sidebar {
    background-color: black;
}

```;
