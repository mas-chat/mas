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

export const darkTheme = `

body {
    font-family: 'Inconsolata', monospace;
    background-color: #333;
}

.window .window-inner {
    background-color: #333;
    font-size: 12px;
}

.window-inner .line a, .window-inner .line a:active, .window-inner .line a:hover {
    color: #1eb7cb;
}

.window-inner .line.service {
    border: none;
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
    background-color: #26252d;
    color: #AFAFAF;
}

.window .nick {
    color: #d2d1d1;
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

.window .line.service {
    background-color: #333;
    margin: 5px 5px 5px 50px;
}

.window .window-toolbar {
    border-top: 1px solid #A5A5A5;
}

.window .window-toolbar .btn, .window .window-buttons.flex-row {
    background-color: black;
}

.window textarea::placeholder {
    color: #d6d6da;
}

.window .window-members .gravatar {
    opacity: 0.3;
}

.sidebar {
    background-color: black;
}

`;
