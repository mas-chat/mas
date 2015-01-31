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

/* globals _, $ */

import Ember from 'ember';

const CURSORWIDTH = 50;

export default Ember.View.extend({
    classNames: [ 'grid', 'flex-1', 'flex-grow-row' ],

    dimensions: null,
    cursor: null,

    didInsertElement: function() {
        $(window).on('resize', Ember.run.bind(this, function() {
            this.layoutWindows(false);
        }));
    },

    windowAdded: function(animate) {
        if (this.get('controller.initDone')) {
            Ember.run.next(this, function() { this.layoutWindows(animate); });
        }
    },

    initReady: function() {
        Ember.run.next(this, function() { this.layoutWindows(false); });
    }.observes('controller.initDone'),

    dragWindowStart: function() {
        $('#window-cursor').show();
    },

    dragWindow: function(event) {
        let x = event.originalEvent.clientX;
        let y = event.originalEvent.clientY;

        if (x === 0 && y === 0) {
            return;
        }

        let cursor = this._calculateCursorPosition(x, y);

        if (!this.cursor || this.cursor.x !== cursor.x || this.cursor.y !== cursor.y ||
            (cursor.section !== 'middle' && this.cursor.section !== cursor.section)) {
            this.cursor = cursor;

            this._drawCursor(cursor);

            this.dimensions.forEach(function(row, rowIndex) {
                row.forEach(function(masWindow, columnIndex) {
                    this._markWindow(masWindow, columnIndex, rowIndex, cursor);
                }.bind(this));
            }.bind(this));

            this._animate(200);
        }
    },

    dragWindowEnd: function() {
        this.dimensions.forEach(function(row) {
            row.forEach(function(masWindow) {
                masWindow.cursor = 'none';
            });
        });

        $('#window-cursor').hide();
        this._animate(200);
    },

    layoutWindows: function(animate) {
        let duration = animate ? 600 : 0;
        let el = this.get('element');
        let container = this._containerDimensions();
        let expandedWindow = el.querySelector('.window.expanded');

        if (expandedWindow) {
            $(expandedWindow).velocity({
                left: 0,
                top: 0,
                width: container.width,
                height: container.height,
            }, duration);
            return;
        }

        let windows = el.querySelectorAll('.window.visible');
        let rowNumbers = _.uniq(_.map(windows,
            function(element) { return element.getAttribute('data-row'); }));
        let rowHeight = Math.round(container.height / rowNumbers.length);

        let dimensions = [];

        _.forEach(rowNumbers, function(row, rowIndex) {
            let windowsInRow = el.querySelectorAll('.window.visible[data-row="' + row + '"]');
            let windowWidth = Math.round(container.width / windowsInRow.length);

            dimensions.push([]);

            _.forEach(windowsInRow, function(element, columnIndex) {
                let dim = {
                    left: columnIndex * windowWidth,
                    top: rowIndex * rowHeight,
                    width: windowWidth,
                    height: rowHeight,
                    el: element
                };

                dimensions[rowIndex].push(dim);
            });
        });

        this.dimensions = dimensions;

        this._animate(duration);
    },

    _markWindow: function(masWindow, x, y, cursor) {
        masWindow.cursor = 'none';

        let rowCount = this.dimensions.length;
        let columnCount = this.dimensions[y].length;
        let section = cursor.section;

        if (section === 'top' || section === 'bottom') {
            if ((cursor.y === y && section === 'top') ||
                (y > 0 && cursor.y === y - 1 && section === 'bottom' )) {
                masWindow.cursor = 'top';
            } else if ((cursor.y === y && section === 'bottom') ||
                (y < rowCount - 1 && cursor.y === y + 1 && section === 'top' )) {
                masWindow.cursor = 'bottom';
            }
        } else {
            if (cursor.y === y && ((section === 'left' && cursor.x === x) ||
                (x > 0 && cursor.x === x - 1 && section === 'right')))  {
                masWindow.cursor = 'left';
            } else if (cursor.y === y && ((section === 'right' && cursor.x === x) ||
                (x < columnCount - 1 && cursor.x - 1 === x && section === 'left'))) {
                masWindow.cursor = 'right';
            }
        }
    },

    _drawCursor: function(cursor) {
        let container = this._containerDimensions();
        let cursorPos = {};
        let cursorWindow = this.dimensions[cursor.y][cursor.x];
        let section = cursor.section;

        if (section === 'top' || section === 'bottom') {
            cursorPos = {
                left: 0,
                width: container.width,
                top: (section === 'top' ?
                    cursorWindow.top : cursorWindow.top + cursorWindow.height) - CURSORWIDTH / 2,
                height: CURSORWIDTH
            };
        } else {
            cursorPos = {
                left: (section === 'left' ?
                    cursorWindow.left : cursorWindow.left + cursorWindow.width) - CURSORWIDTH / 2,
                width: cursor.x === 0 && section === 'left' ||
                    (cursor.x === this.dimensions[cursor.y].length - 1 && section === 'right') ?
                    CURSORWIDTH / 2 : CURSORWIDTH,
                top: this.dimensions[cursor.y][0].top,
                height: this.dimensions[cursor.y][0].height
            };
        }

        $('#window-cursor').css(cursorPos);
    },

    _animate: function(duration) {
        const halfCursorWidth = Math.round(CURSORWIDTH / 2);

        this.dimensions.forEach(function(row) {
            row.forEach(function(windowDim) {
                let $el = $(windowDim.el);
                let position = $el.position();

                // Keep all values in hash to make rounding easy in the next step
                let oldDim = {
                    left: position.left,
                    top: position.top,
                    width: $el.width(),
                    height: $el.height(),
                };

                let newDim = {
                    left: windowDim.cursor === 'left' ?
                        windowDim.left + halfCursorWidth : windowDim.left,
                    top: windowDim.cursor === 'top' ?
                        windowDim.top + halfCursorWidth :  windowDim.top,
                    width: windowDim.cursor === 'left' || windowDim.cursor === 'right' ?
                        windowDim.width - halfCursorWidth : windowDim.width,
                    height: windowDim.cursor === 'top' || windowDim.cursor === 'bottom' ?
                        windowDim.height - halfCursorWidth : windowDim.height
                };

                if (newDim.left === oldDim.left && newDim.top === oldDim.top &&
                    newDim.width === oldDim.width && newDim.height === oldDim.height) {
                    // Nothing to animate
                    return;
                }

                $el.velocity('stop').velocity(newDim, {
                    duration: duration,
                    visibility: 'visible',
                    complete: function() {
                        // Make sure window shows the latest messages
                        let view = Ember.View.views[$el.attr('id')];
                        Ember.run.next(view, view.layoutDone);
                    }
                });
            });
        });
    },

    _containerDimensions: function() {
        return {
            width: this.$().width(),
            height: this.$().height()
        };
    },

    _calculateCursorPosition: function(x, y) {
        let windowX = 0;
        let windowY = 0;
        let masWindow;

        this.dimensions.forEach(function(row, index) {
            if (row[0].top < y) {
                windowY = index;
            }
        });

        this.dimensions[windowY].forEach(function(column, index) {
            if (column.left < x) {
                windowX = index;
                masWindow = column;
            }
        });

        return {
            x: windowX,
            y: windowY,
            section: this._whichSection(masWindow, x, y)
        }
    },

    _whichSection: function(windowDim, x, y) {
        // -----------------
        // |\      a      /|
        // | \           / |
        // |  -----------  |
        // |d |    n    | b|
        // |  -----------  |
        // | /     c     \ |
        // |/             \|
        // -----------------

        const BORDER = 50; // Defines the non-active area ('n' in the figure)

        let ab = true;
        let cb = false;
        let section;

        if (windowDim.left + BORDER < x && windowDim.left + windowDim.width - BORDER > x &&
            windowDim.top + BORDER < y && windowDim.top + windowDim.height - BORDER > y) {
            return 'middle';
        } else {
            if (windowDim.height * (x - windowDim.left) < windowDim.width * (y - windowDim.top)) {
                ab = false;
            }

            if (windowDim.height * (windowDim.left + windowDim.width - x) <
                windowDim.width * (y - windowDim.top)) {
                cb = true;
            }

            if (ab && !cb) {
                return 'top'; // a
            } else if (ab && cb) {
                return 'right'; // b
            } else if (!ab && cb) {
                return 'bottom'; // c
            } else if (!ab && !cb) {
                return 'left'; // d
            }
        }
    }
});
