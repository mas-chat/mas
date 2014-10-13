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

Mas.WindowView = Ember.View.extend(Mas.UploadMixin, {
    classNames: [ 'window', 'flex-grow-column' ],
    classNameBindings: [ 'expanded:expanded:', 'visible:visible:hidden' ],
    attributeBindings: [ 'row:data-row', 'draggable' ],

    row: Ember.computed.alias('controller.model.row'),
    visible: Ember.computed.alias('controller.model.visible'),
    expanded: false,
    initial: true,

    // TBD: messages is here because of the mixin. Is there better way?
    messages: Ember.computed.alias('controller.model.messages'),

    draggable: function() {
        return 'true';
    }.property(),

    visibilityChanged: function() {
        this.get('parentView').windowAdded(true);
    }.observes('controller.model.visible'),

    $messagePanel: null,
    $images: null,

    actions: {
        expand: function() {
            this.set('expanded', true);
            this.get('parentView').windowAdded(true);
        },

        compress: function() {
            this.set('expanded', false);
            this.get('parentView').windowAdded(true);
        }
    },

    layoutDone: function() {
        this._goToBottom();

        if (this.get('initial')) {
            this._updateImages();
            this._addScrollHandler();
            this.set('initial', false);
        }

        this._showImages();
    },

    didInsertElement: function() {
        var that = this;

        this.$messagePanel = this.$('.window-messages');

        var observer = new MutationObserver(Ember.run.bind(this, function() {
            that._goToBottom();
            that._updateImages();
            that._showImages();
        }));
        observer.observe(this.$messagePanel[0], { childList: true });

        this.$('.window-caption').tooltip();
        this.$messagePanel.tooltip({
            selector: '.timestamp',
            placement: 'right'
        });

        var selectedUserId;

        this.$('.window-members').contextmenu({
            target: '#window-contextMenu',
            before: function(e) {
                var $target = $(e.target);

                if ($target.hasClass('window-members')) {
                    return false;
                }

                e.preventDefault();
                var selectedNick = $target.text();
                selectedUserId = $target.data('userid');

                this.getMenu().find('li').eq(0).text(selectedNick);
                return true;
            },
            onItem: function(context, e) {
                var action = $(e.target).data('action');
                that.get('controller').send(action, selectedUserId);
            }
        });

        this.$('.window-members').click(function(e) {
            $(this).contextmenu('show', e);
            e.preventDefault();
            return false;
        });

        var emojisList = $.map(emojify.emojiNames, function(value, i) {
            return { id: i, name: value };
        });

        var emojiListTemplate =
            '<li data-value=":${name}:">' +
            '<img src="/dist/images/emojify/${name}.png">${name}' +
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

        var fileInput = this.$('.btn-file input')[0];

        FileAPI.event.on(fileInput, 'change', function(evt) {
            var files = FileAPI.getFiles(evt); // Retrieve file list
            this.upload(files, this.get('controller'));
        }.bind(this));

        this.get('parentView').windowAdded(false);
    },

    _goToBottom: function() {
        if (this.get('controller.model.scrollLock')) {
            return;
        }

        var scrollPos = this.$messagePanel.scrollTop();
        var bottom = this.$messagePanel.prop('scrollHeight');
        var height = this.$messagePanel.height();

        if (bottom - scrollPos > 2 * height) {
            this._moveTo(bottom);
        } else {
            this._scrollTo(bottom);
        }
    },

    _scrollTo: function(pos) {
        this.$messagePanel.stop();
        this.$messagePanel.css('overflow-y', 'hidden');

        this.$messagePanel.animate({
            scrollTop: pos
        }, 500, function() {
            this.$messagePanel.css('overflow-y', 'auto');
        }.bind(this));
    },

    _moveTo: function(pos) {
        this.$messagePanel.css('overflow-y', 'hidden');
        this.$messagePanel.scrollTop(pos);
        this.$messagePanel.css('overflow-y', 'auto');
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
                    that._goToBottom();
                });

                return false;
            }

            return true;
        });
    }
});
