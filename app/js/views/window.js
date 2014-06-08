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

App.WindowView = Ember.View.extend({
    classNames: ['window', 'flex-grow-column', 'flex-1'],
    $messagePanel: null,

    scrollTo: function(pos) {
        this.$messagePanel.stop();
        this.$messagePanel.css('overflow-y', 'hidden');

        this.$messagePanel.animate({
            scrollTop: pos
        }, 500, function() {
            this.$messagePanel.css('overflow-y', 'auto');
        }.bind(this));
    },

    moveTo: function(pos) {
        this.$messagePanel.css('overflow-y', 'hidden');
        this.$messagePanel.scrollTop(pos);
        this.$messagePanel.css('overflow-y', 'auto');
    },

    goToBottom: function() {
        var scrollPos = this.$messagePanel.scrollTop();
        var bottom = this.$messagePanel.prop('scrollHeight');
        var height = this.$messagePanel.height();

        if (bottom - scrollPos > 2 * height) {
            this.moveTo(bottom);
        } else {
            this.scrollTo(bottom);
        }
    },

    handleMutations: function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            for (var ii = 0; ii < mutations[i].addedNodes.length; ii++) {
                var newNode = mutations[i].addedNodes[ii];

                if (newNode.nodeName === 'DIV') {
                    // New node is a div for new line, not Ember internal script tag
                    imagesLoaded(newNode, Ember.run.bind(this, this.goToBottom));
                }
            }
        }

        this.goToBottom();
    },

    didInsertElement: function() {
        this.$messagePanel = this.$('.window-messages');
        this.goToBottom();

        var observer = new MutationObserver(Ember.run.bind(this, this.handleMutations));
        observer.observe(this.$messagePanel[0], { childList: true });

        this.$messagePanel.scroll(function() {
            // TBD
        });

        // Highlight the window that was moved
        if (this.get('controller.model.animate') === true) {
            this.set('controller.model.animate', false);
            this.$().addClass('pulse animated');
        }

        var emojisList = $.map(emojify.emojiNames, function(value, i) {
            return {'id':i, 'name':value};
        });

        var emojiListTemplate =
            '<li data-value=":${name}:">' +
            '<img src="/vendor/emojify.js/images/emoji/${name}.png">${name}' +
            '</li>';

        this.$('.form-control').atwho({
            at: ':',
            tpl: emojiListTemplate,
            data: emojisList
        });

        this.$('.user-img').magnificPopup({
            type: 'image',
            closeOnContentClick: true,
            image: {
                verticalFit: false,
                titleSrc: function(item) {
                    var href = item.el.attr('href');

                    return '<small>Link to the original image:</small><a href="' + href +
                        '" target="_newtab">' + href + '</a>';
                }
            }
        });
    }
});
