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

var _ = require('lodash/dist/lodash');

Mas.GridView = Ember.View.extend({
    classNames: ['grid', 'flex-1'],

    PADDING: 5,

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
        this.windowAdded(false);
    }.observes('controller.initDone'),

    layoutWindows: function(animate) {
        var that = this;
        var duration = animate ? 600 : 0;
        var el = this.get('element');
        var container = this._containerDimensions();
        var expandedWindow = el.querySelector('.window.expanded');

        if (expandedWindow) {
            $(expandedWindow).velocity({
                left: this.PADDING + 'px',
                top : this.PADDING + 'px',
                width: container.width - 2 * this.PADDING + 'px',
                height : container.height - 2 * this.PADDING + 'px',
            }, duration);
            return;
        }

        var windows = el.querySelectorAll('.window.visible');
        var rowNumbers = _.uniq(_.map(windows,
            function(element) { return element.getAttribute('data-row'); }));
        var rowHeight = (container.height - (rowNumbers.length + 1) * this.PADDING) /
            rowNumbers.length;

        _.forEach(rowNumbers, function(row, rowIndex) {
            var windowsInRow = el.querySelectorAll('.window.visible[data-row="' + row + '"]');
            var windowWidth = (container.width - (windowsInRow.length + 1) * that.PADDING) /
                windowsInRow.length;

            _.forEach(windowsInRow, function(element, index) {
                that._animate(element, index, rowIndex, windowWidth, rowHeight, duration);
            });
        });
    },

    _animate: function(el, columnIndex, rowIndex, width, height, duration) {
        var $el = $(el);
        var position = $el.position();

        var dim = {
            currentLeft: position.left,
            currentTop: position.top,
            currentWidth: $el.width(),
            currentHeight: $el.height(),
            left: columnIndex * width + (columnIndex + 1) * this.PADDING,
            top: rowIndex * height + (rowIndex + 1) * this.PADDING,
            width: width,
            height: height
        };

        dim = _.mapValues(dim, function(val) { return Math.round(val); });

        if (dim.left === dim.currentLeft && dim.top === dim.currentTop &&
            dim.width === dim.currentWidth && dim.height === dim.currentHeight) {
            // Nothing to animate
            return;
        }

        $(el).velocity('stop').velocity({
            left:  dim.left + 'px',
            top :  dim.top + 'px',
            width: dim.width + 'px',
            height : dim.height + 'px'
        }, duration);
    },

    _containerDimensions: function() {
        return {
            width: this.$().width(),
            height: this.$().height()
        };
    }
});
