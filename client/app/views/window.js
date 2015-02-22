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

/* globals $, _, FileAPI, emojify */

import Ember from 'ember';

export default Ember.View.extend({
    classNames: [ 'window', 'flex-grow-column' ],
    attributeBindings: [ 'row:data-row', 'column:data-column' ],

    classNameBindings: [
        'expanded:expanded:',
        'visible:visible:hidden',
        'ircServerWindow:irc-server-window:'
    ],

    row: Ember.computed.alias('controller.model.row'),
    column: Ember.computed.alias('controller.model.column'),
    visible: Ember.computed.alias('controller.model.visible'),

    expanded: false,
    initial: true,
    animating: false,
    scrolling: false,

    windowChanged: function() {
        this.get('parentView').windowChanged(true);
    }.observes('visible', 'row', 'column'),

    ircServerWindow: function() {
        return this.get('controller.model.userId') === 'iSERVER' ? 'irc-server-window' : '';
    }.property('controller.model.userId'),

    $messagePanel: null,
    $images: null,

    actions: {
        expand: function() {
            this.set('expanded', true);
            this.get('parentView').windowChanged(true);
        },

        compress: function() {
            this.set('expanded', false);
            this.get('parentView').windowChanged(true);
        }
    },

    mouseDown: function(event) {
        console.log(event);

        if (!$(event.target).hasClass('fa-arrows')) {
            return; // Not moving the window
        }

        let gridView = this.get('parentView');

        gridView.dragWindowStart(this, event);

        function handleDragMove(event) {
            gridView.dragWindow(event);
            event.preventDefault();
        }

        function handleDragEnd(event) {
            gridView.dragWindowEnd(event);
            event.preventDefault();

            document.removeEventListener('mousemove', handleDragMove, false);
            document.removeEventListener('mouseup', handleDragEnd, false);
        }

        document.addEventListener('mousemove', handleDragMove, false);
        document.addEventListener('mouseup', handleDragEnd, false);
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
        let that = this;

        this.$messagePanel = this.$('.window-messages');

        let observer = new MutationObserver(Ember.run.bind(this, function() {
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

        let selectedUserId;

        this.$('.window-members').contextmenu({
            target: '#window-contextMenu',
            before: function(e) {
                let $target = $(e.target);

                if ($target.hasClass('window-members')) {
                    return false;
                }

                e.preventDefault();
                let $row = $target.closest('.member-row');

                let selectedNick = $row.data('nick');
                let avatar = $row.find('.gravatar').attr('src');
                selectedUserId = $row.data('userid');

                this.getMenu().find('li').eq(0).html(
                    '<img class="menu-avatar" src="' + avatar + '">' +  selectedNick);
                return true;
            },
            onItem: function(context, e) {
                let action = $(e.target).data('action');
                that.get('controller').send(action, selectedUserId);
            }
        });

        this.$('.window-members').click(function(e) {
            $(this).contextmenu('show', e);
            e.preventDefault();
            return false;
        });

        let emojisList = $.map(emojify.emojiNames, function(value, i) {
            return { id: i, name: value };
        });

        let emojiListTemplate = '<li><img src="/app/assets/images/emoji/${name}.png"> ${name}</li>';

        this.$('.form-control').atwho({
            at: ':',
            displayTpl: emojiListTemplate,
            insertTpl: ':${name}:',
            data: emojisList
        });

        function getNick(item) {
            return item.nick;
        }

        let nickList = this.get('controller.model.operatorNames').map(getNick)
            .concat(this.get('controller.model.voiceNames').map(getNick))
            .concat(this.get('controller.model.userNames').map(getNick));

        this.$('.form-control').atwho({
            at: '@',
            data: nickList
        });

        this.$messagePanel.magnificPopup({
            type: 'image',
            delegate: '.user-img',
            closeOnContentClick: true,
            image: {
                verticalFit: false,
                titleSrc: function(item) {
                    let href = item.el.attr('href');

                    return '<small>Link to the original image:</small><a href="' + href +
                        '" target="_newtab">' + href + '</a>';
                }
            }
        });

        let fileInput = this.$('.btn-file input')[0];

        FileAPI.event.on(fileInput, 'change', function(evt) {
            let files = FileAPI.getFiles(evt); // Retrieve file list
            this.get('controller').send('upload', files, 'jpeg');
        }.bind(this));

        this.get('parentView').windowChanged(false);
    },

    _goToBottom: function() {
        if (this.get('controller.model.scrollLock')) {
            return;
        }

        this.$('.window-messages > div:last-child').velocity('stop').velocity('scroll', {
            container: this.$messagePanel,
            duration: 300,
            easing: 'spring',
            begin: function() {
                this.$messagePanel.css('overflow-y', 'hidden');
                this.set('scrolling', true);
            }.bind(this),
            complete: function() {
                this.$messagePanel.css('overflow-y', 'auto');
                this.set('scrolling', false);
            }.bind(this)
        });
    },

    _addScrollHandler: function() {
        this.$messagePanel.on('scroll', _.throttle(Ember.run.bind(this, function() {
            if (this.get('animating') || this.get('scrolling')) {
                return;
            }

            let $panel = this.$messagePanel;
            let scrollPos = $panel.scrollTop();

            if (scrollPos + $panel.innerHeight() >= $panel.prop('scrollHeight')) {
                this.get('controller').send('scrollBottom');
            } else {
                this.get('controller').send('scrollUp');
            }

            this.set('controller.model.deletedLine', false); // Hack

            this._showImages();
        }, 100)));
    },

    _updateImages: function() {
        if (this.$images === null) {
            this.$images = $([]);
        }

        this.$images = this.$images.add(this.$('img[data-src]'));
    },

    _showImages: function() {
        let placeHolderHeight = 31;
        let panelHeight = this.$messagePanel.height();
        let that = this;

        this.$images = this.$images.filter(function() {
            let $img = $(this);

            // We want to know image's position in .window-messages container div. For position()
            // to work correctly, .window-messages has to have position set to 'relative'. See
            // jQuery offsetParent() documentation for details.
            let pos = $img.position().top;

            if (pos + placeHolderHeight >= 0 && pos <= panelHeight) {
                $img.attr('src', $img.data('src'));
                $img.one('load error', function() {
                    $img.removeClass('loader loader-small-dark');
                    $img.removeAttr('data-src');
                    that._goToBottom();
                });

                return false;
            }

            return true;
        });
    }
});
