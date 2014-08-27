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

Mas.WindowView = Ember.View.extend({
    classNames: ['window', 'flex-grow-column'],
    attributeBindings: ['row:data-row', 'visible:data-visible'],

    row: Ember.computed.alias('controller.model.row'),

    visible: function() {
        return this.get('controller.model.visible') ? 'true' : 'false';
    }.property('controller.model.visible'),

    visibilityChanged: function() {
        this.get('parentView').windowAdded(true);
    }.observes('controller.model.visible'),

    $messagePanel: null,
    $images: null,
    ready: false,

    actions: {
        expand: function() {
            //TBD: Buggy
            var origOffset = this.$().offset();
            var origWidth = this.$().width();
            var origHeight = this.$().height();

            this.$().css('display', 'block');
            this.$().css('position', 'absolute');
            this.$().css('z-index', 1000);

            this.$().width(origWidth);
            this.$().height(origHeight);
            this.$().offset(origOffset);

            // var w = $(window).width() - 8;
            // var h = $(window).height() - 8;

            // this.$().animate({
            //     width: w,
            //     height: h,
            //     left: 4,
            //     top: 4
            // }, 1000);
        }
    },

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
        if (this.get('controller.model.scrollLock')) {
            return;
        }

        var scrollPos = this.$messagePanel.scrollTop();
        var bottom = this.$messagePanel.prop('scrollHeight');
        var height = this.$messagePanel.height();

        if (bottom - scrollPos > 2 * height) {
            this.moveTo(bottom);
        } else {
            this.scrollTo(bottom);
        }
    },

    initReady: function() {
        if (this.get('controller.model.initDone')) {
            this._setupScrolling();
        }
    }.observes('controller.model.initDone'),

    didInsertElement: function() {
        var that = this;

        this.$messagePanel = this.$('.window-messages');

        var observer = new MutationObserver(Ember.run.bind(this, function() {
            that.goToBottom();
            that._updateImages();
        }));
        observer.observe(this.$messagePanel[0], { childList: true });

        this._setupScrolling();

        this.$('.window-caption').tooltip();
        this.$messagePanel.tooltip({
            selector: '.timestamp',
            placement: 'right'
        });

        var selectedNick;

        this.$('.window-members').contextmenu({
            target: '#window-contextMenu',
            before: function(e) {
                var $target = $(e.target);

                if ($target.hasClass('window-members')) {
                    return false;
                }

                e.preventDefault();
                selectedNick = $target.text();
                this.getMenu().find('li').eq(0).text(selectedNick);
                return true;
            },
            onItem: function(context, e) {
                var action = $(e.target).data('action');
                that.get('controller').send(action, selectedNick);
            }
        });

        this.$('.window-members').click(function(e) {
            $(this).contextmenu('show', e);
            e.preventDefault();
            return false;
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

        this.$messagePanel.magnificPopup({
            type: 'image',
            delegate: '.user-img',
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

        this.get('parentView').windowAdded(false);
    },

    _setupScrolling: function() {
        if (!this.ready) {
            // Only act on second time, when INITDONE message has been received
            // and the view is ready
            this.ready = true;
            return;
        }

        this._updateImages();

        this._addScrollHandler();
        this._showImages();
        this.goToBottom();
    },

    _addScrollHandler: function() {
        var prevScrollPos = 0;

        this.$messagePanel.on('scroll', Ember.run.bind(this, function() {
            var $panel = this.$messagePanel;
            var scrollPos = $panel.scrollTop();

            if (prevScrollPos > scrollPos) {
                this.get('controller').send('scrollUp');
            } else if (scrollPos + $panel.innerHeight() >= $panel.prop('scrollHeight')) {
                this.get('controller').send('scrollBottom');
            }

            prevScrollPos = scrollPos;
            this.set('controller.model.deletedLine', false); // Hack

            this._showImages();
        }));
    },

    _updateImages: function() {
        if (this.$images === null) {
            this.$images = $([]);
        }

        this.$images = this.$images.add(this.$('img[data-src]'));
    },

    _showImages: function() {
        var placeHolderHeight = 31;
        var panelHeight = this.$messagePanel.height();
        var that = this;

        this.$images = this.$images.filter(function() {
            var $img = $(this);

            // We want to know image's position in .window-messages container div. For position()
            // to work correctly, .window-messages has to have position set to 'relative'. See
            // jQuery offsetParent() documentation for details.
            var pos = $img.position().top;

            if (pos + placeHolderHeight >= 0 && pos <= panelHeight) {
                $img.attr('src', $img.data('src'));
                $img.one('load error', function() {
                    $img.removeAttr('data-src');
                    that.goToBottom();
                });

                return false;
            }

            return true;
        });
    }
});
