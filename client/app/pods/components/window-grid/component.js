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

export default Ember.Component.extend({
    classNames: [ 'grid', 'flex-1', 'flex-grow-column' ],

    dimensions: null,
    cursor: {},
    movingWindow: null,
    activeDesktop: 0,

    store: Ember.inject.service(),
    socket: Ember.inject.service(),

    actions: {
        joinLobby() {
            this.get('socket').send({
                id: 'JOIN',
                network: 'MAS',
                name: 'lobby'
            });
        },

        menuAction(command, discussionWindow) {
            this.sendAction('menuAction', command, discussionWindow);
        },

        windowAction(command, discussionWindow, value) {
            this.sendAction('windowAction', command, discussionWindow, value);
        },

        relayout(options) {
            if (this.get('store.windowListComplete')) {
                Ember.run.next(this, function() { this._layoutWindows(options.animate); });
            }
        },

        dragWindowStart(discussionWindow, event) {
            this._dragWindowStart(discussionWindow, event);
        }
    },

    didInsertElement() {
        $(window).on('resize', Ember.run.bind(this, function() {
            this._layoutWindows(false);
        }));
    },

    initReady: function() {
        Ember.run.next(this, function() { this._layoutWindows(false); });
    }.observes('store.windowListComplete'),

    _dragWindowStart(discussionWindow, event) {
        let that = this;
        this.movingWindow = discussionWindow;

        this.sendAction('dragActiveAction', discussionWindow);

        this.movingWindow.$().addClass('moving').css('z-index', 200);
        $('#window-cursor').show();

        this._dragWindow(event);

        function handleDragMove(event) {
            that._dragWindow(event);
            event.preventDefault();
        }

        function handleDragEnd() {
            that._dragWindowEnd();

            document.removeEventListener('mousemove', handleDragMove, false);
            document.removeEventListener('mouseup', handleDragEnd, false);
        }

        document.addEventListener('mousemove', handleDragMove, false);
        document.addEventListener('mouseup', handleDragEnd, false);
    },

    _dragWindow(event) {
        let cursor = this._calculateCursorPosition(event);

        if (cursor.x === null && this.cursor.x === null) {
            // Still outside of grid
            return;
        }

        if (this.cursor.x !== cursor.x || this.cursor.y !== cursor.y ||
            (cursor.section !== 'middle' && cursor.section !== this.cursor.section)) {
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

    _dragWindowEnd() {
        let cursor = this.cursor;

        this.sendAction('dragActiveAction', false);

        this.movingWindow.$().removeClass('moving').css('z-index', '');
        $('#window-cursor').hide();

        if (this.cursor.x === null) {
            return;
        }

        this.dimensions.forEach(function(row, rowIndex) {
            row.forEach(function(masWindow, columnIndex) {
                masWindow.cursor = 'none';

                let deltaX = 0;
                let deltaY = 0;

                if (cursor.section === 'top' || cursor.section === 'bottom') {
                    deltaY = rowIndex > cursor.y || (rowIndex === cursor.y &&
                        cursor.section === 'top') ? 1 : 0;
                } else {
                    deltaX = rowIndex === cursor.y && (columnIndex > cursor.x ||
                        (columnIndex === cursor.x && cursor.section === 'left')) ? 1 : 0;
                }

                let view = Ember.View.views[masWindow.el.getAttribute('id')];
                view.set('row', rowIndex + deltaY);
                view.set('column', columnIndex + deltaX);
            });
        });

        this.movingWindow.set('row', this.cursor.y + (this.cursor.section === 'bottom' ? 1 : 0));
        this.movingWindow.set('column', this.cursor.x + (this.cursor.section === 'right' ? 1 : 0));
    },

    _layoutWindows(animate) {
        let duration = animate ? 600 : 0;
        let el = this.get('element');
        let container = this._containerDimensions();
        let expandedWindow = el.querySelector('.window.expanded');

        if (expandedWindow) {
            $(expandedWindow).velocity({
                left: 0,
                top: 0,
                width: container.width,
                height: container.height
            }, duration);
            return;
        }

        let windows = el.querySelectorAll(
            '.window.visible[data-desktop=\'' + this.get('activeDesktop') + '\']');

        let rowNumbers = _.uniq(_.map(windows,
            function(element) { return parseInt(element.getAttribute('data-row')); })).sort();
        let rowHeight = Math.round(container.height / rowNumbers.length);

        let dimensions = [];

        _.forEach(rowNumbers, function(row, rowIndex) {
            let windowsInRow = el.querySelectorAll('.window.visible[data-row="' + row + '"]');
            let windowWidth = Math.round(container.width / windowsInRow.length);

            dimensions.push([]);

            windowsInRow = _.sortBy(windowsInRow, function(element) {
                return parseInt(element.getAttribute('data-column'));
            });

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

    _markWindow(masWindow, x, y, cursor) {
        masWindow.cursor = 'none';

        let rowCount = this.dimensions.length;
        let columnCount = this.dimensions[y].length;
        let section = cursor.section;

        if ((cursor.y === y && section === 'top') ||
            (y > 0 && cursor.y === y - 1 && section === 'bottom' )) {
            masWindow.cursor = 'top';
        } else if ((cursor.y === y && section === 'bottom') ||
            (y < rowCount - 1 && cursor.y === y + 1 && section === 'top' )) {
            masWindow.cursor = 'bottom';
        } else if (cursor.y === y && ((section === 'left' && cursor.x === x) ||
            (x > 0 && cursor.x === x - 1 && section === 'right'))) {
            masWindow.cursor = 'left';
        } else if (cursor.y === y && ((section === 'right' && cursor.x === x) ||
            (x < columnCount - 1 && cursor.x - 1 === x && section === 'left'))) {
            masWindow.cursor = 'right';
        }
    },

    _drawCursor(cursor) {
        if (cursor.x === null) {
            $('#window-cursor').hide();
            return;
        } else {
            $('#window-cursor').show();
        }

        let container = this._containerDimensions();
        let cursorPos = {};
        let cursorWindow = this.dimensions[cursor.y][cursor.x];
        let section = cursor.section;

        if (section === 'top' || section === 'bottom') {
            let topPos = (section === 'top' ?
                cursorWindow.top : cursorWindow.top + cursorWindow.height) - CURSORWIDTH / 2;

            if (cursor.y === 0 && section === 'top') {
                topPos = cursorWindow.top;
            } else if (cursor.y === this.dimensions.length - 1 && section === 'bottom') {
                topPos = cursorWindow.top + cursorWindow.height - CURSORWIDTH;
            }

            cursorPos = {
                left: 0,
                width: container.width,
                top: topPos,
                height: CURSORWIDTH
            };
        } else {
            let leftPos = (section === 'left' ?
                cursorWindow.left : cursorWindow.left + cursorWindow.width) - CURSORWIDTH / 2;

            if (cursor.x === 0 && section === 'left') {
                leftPos = cursorWindow.left;
            } else if (cursor.x === this.dimensions[cursor.y].length - 1 && section === 'right') {
                leftPos = cursorWindow.left + cursorWindow.width - CURSORWIDTH;
            }

            cursorPos = {
                left: leftPos,
                width: CURSORWIDTH,
                top: this.dimensions[cursor.y][0].top,
                height: this.dimensions[cursor.y][0].height
            };
        }

        $('#window-cursor').css(cursorPos);
    },

    _animate(duration) {
        this.dimensions.forEach(function(row, rowIndex) {
            row.forEach(function(windowDim, columnIndex) {
                let $el = $(windowDim.el);
                let position = $el.position();

                // Keep all values in hash to make rounding easy in the next step
                let oldDim = {
                    left: position.left,
                    top: position.top,
                    width: $el.width(),
                    height: $el.height()
                };

                let cursorSpace = this._calculateSpaceForCursor(
                    columnIndex, rowIndex, windowDim.cursor);

                let newDim = {
                    left: windowDim.cursor === 'left' ?
                        windowDim.left + cursorSpace : windowDim.left,
                    top: windowDim.cursor === 'top' ?
                        windowDim.top + cursorSpace :  windowDim.top,
                    width: windowDim.cursor === 'left' || windowDim.cursor === 'right' ?
                        windowDim.width - cursorSpace : windowDim.width,
                    height: windowDim.cursor === 'top' || windowDim.cursor === 'bottom' ?
                        windowDim.height - cursorSpace : windowDim.height
                };

                const PADDING = 2 * 3;

                if (newDim.left === oldDim.left && newDim.top === oldDim.top &&
                    newDim.width === oldDim.width + PADDING &&
                    newDim.height === oldDim.height + PADDING) {
                    // Nothing to animate
                    return;
                }

                let discussionWindow = Ember.View.views[$el.attr('id')];

                $el.velocity('stop').velocity(newDim, {
                    duration: duration,
                    visibility: 'visible',
                    begin() {
                        discussionWindow.set('animating', true);
                    },
                    complete() {
                        discussionWindow.set('animating', false);

                        // Make sure window shows the latest messages
                        Ember.run.next(discussionWindow, discussionWindow.layoutDone);
                    }
                });
            }.bind(this));
        }.bind(this));
    },

    _calculateSpaceForCursor(x, y, cursor) {
        let width = Math.round(CURSORWIDTH / 2);
        let rows = this.dimensions.length;
        let columns = this.dimensions[y].length;

        if ((y === 0 && cursor === 'top') || (y === rows - 1 && cursor === 'bottom') ||
            (x === 0 && cursor === 'left') || (x === columns - 1 && cursor === 'right')) {
            width = CURSORWIDTH;
        }

        return width;
    },

    _containerDimensions() {
        return {
            width: this.$().width(),
            height: this.$().height()
        };
    },

    _calculateCursorPosition(event) {
        const outOfBoundsCursor = { x: null, y: null, section: null };

        let x = event.clientX;
        let y = event.clientY;

        let windowX = 0;
        let windowY = 0;
        let masWindow;

        if (this._containerDimensions().width < x) {
            return outOfBoundsCursor;
        }

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

        if (!masWindow) {
            return outOfBoundsCursor;
        } else {
            return {
                x: windowX,
                y: windowY,
                section: this._whichSection(masWindow, x, y)
            };
        }
    },

    _whichSection(windowDim, x, y) {
        // -----------------
        // |\      t      /|
        // | \           / |
        // |  -----------  |
        // |l |    m    | r|
        // |  -----------  |
        // | /     b     \ |
        // |/             \|
        // -----------------

        const BORDER = 50; // Defines the non-active area ('n' in the figure)

        let topOrRight = true;
        let bottomOrRight = false;

        if (windowDim.left + BORDER < x && windowDim.left + windowDim.width - BORDER > x &&
            windowDim.top + BORDER < y && windowDim.top + windowDim.height - BORDER > y) {
            return 'middle'; // m
        } else {
            if (windowDim.height * (x - windowDim.left) < windowDim.width * (y - windowDim.top)) {
                topOrRight = false;
            }

            if (windowDim.height * (windowDim.left + windowDim.width - x) <
                windowDim.width * (y - windowDim.top)) {
                bottomOrRight = true;
            }

            if (topOrRight && !bottomOrRight) {
                return 'top'; // t
            } else if (topOrRight && bottomOrRight) {
                return 'right'; // r
            } else if (!topOrRight && bottomOrRight) {
                return 'bottom'; // b
            } else if (!topOrRight && !bottomOrRight) {
                return 'left'; // l
            }
        }
    }
});
