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

/* globals $, _, FileAPI, emojify, titlenotifier */

import Ember from 'ember';
import { play } from '../helpers/sound';
import UploadMixin from '../mixins/upload';

export default Ember.Component.extend(UploadMixin, {
    classNames: [ 'window', 'flex-grow-column' ],
    attributeBindings: [ 'row:data-row', 'column:data-column' ],

    classNameBindings: [
        'expanded:expanded:',
        'visible:visible:hidden',
        'ircServerWindow:irc-server-window:'
    ],

    expanded: false,
    initialAddition: true,
    animating: false,
    scrolling: false,

    $messagePanel: null,
    $images: null,
    logModeEnabled: false,
    wideMemberList: true,

    row: Ember.computed.alias('content.row'),
    column: Ember.computed.alias('content.column'),
    visible: Ember.computed.alias('content.visible'),

    windowChanged: function() {
        this.get('parentView').windowChanged(true);
    }.observes('visible', 'row', 'column'),

    lineAdded: function() {
        Ember.run.debounce(this, function() {
            let initialAddition = this.get('initialAddition');

            if (initialAddition) {
                this._addScrollHandler();
                this.set('initialAddition', false);
            }

            this._updateImages();
            this._goToBottom(!initialAddition);
        }, 200);

        if (!this.get('visible') || this.get('content.scrollLock')) {
            this.incrementProperty('content.newMessagesCount');
        }

        if (document.hidden) {
            // Browser title notification
            if (this.get('content.titleAlert')) {
                titlenotifier.add();
            }

            // Sound notification
            if (this.get('content.sounds')) {
                play();
            }
        }
    }.observes('content.messages.@each').on('init'),

    ircServerWindow: function() {
        return this.get('content.userId') === 'iSERVER' ? 'irc-server-window' : '';
    }.property('content.userId'),

    isGroup: function() {
        return this.get('content.type') === 'group';
    }.property('content.type'),

    cssType: function() {
        if (this.get('content.type') === 'group') {
            return 'group';
        } else if (this.get('content.userId') === 'iSERVER') {
            return 'server-1on1';
        } else {
            return 'private-1on1';
        }
    }.property('content.type'),

    actions: {
        expand() {
            this.set('expanded', true);
            this.get('parentView').windowChanged(true);
        },

        compress() {
            this.set('expanded', false);
            this.get('parentView').windowChanged(true);
        },

        hide() {
            this.set('content.visible', false);
            this.set('content.timeHidden', Date.now());
        },

        browse() {
            this.set('logModeEnabled', true);
        },

        toggleMemberListWidth() {
            this.toggleProperty('wideMemberList');
        },

        sendMessage() {
            this.sendAction('action', 'sendMessage', this.content, this.get('newMessage'));
            this.set('newMessage', '');
        },

        close() {
            this.sendAction('action', 'close', this.content)
        },

        menu(operation) {
            this.sendAction('menuAction', operation, this.content);
        }
    },

    mouseDown(event) {
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

    layoutDone() {
        this._goToBottom(false);
    },

    didInsertElement() {
        let that = this;

        this.$messagePanel = this.$('.window-messages');

        this.$('.window-caption').tooltip();
        this.$messagePanel.tooltip({
            selector: '.timestamp',
            placement: 'right'
        });

        let selectedUserId;

        this.$('.window-members').contextmenu({
            target: '#window-contextMenu',
            before(e) {
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
            onItem(context, e) {
                let action = $(e.target).data('action');
                that.sendAction('action', action, that.content, selectedUserId);
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

        let nickList = this.get('content.operatorNames').map(getNick)
            .concat(this.get('content.voiceNames').map(getNick))
            .concat(this.get('content.userNames').map(getNick));

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
                titleSrc(item) {
                    let href = item.el.attr('href');

                    return '<small>Link to the original image:</small><a href="' + href +
                        '" target="_newtab">' + href + '</a>';
                }
            }
        });

        let fileInput = this.$('.btn-file input')[0];

        FileAPI.event.on(fileInput, 'change', function(evt) {
            let files = FileAPI.getFiles(evt); // Retrieve file list
            this.send('upload', files, 'jpeg');
        }.bind(this));

        this.get('parentView').windowChanged(false);
    },

    willDestroyElement() {
        let gridView = this.get('parentView');

        Ember.run.next(this, function() {
            gridView.windowChanged(true);
        });
    },

    _goToBottom(animate) {
        if (this.get('content.scrollLock')) {
            return;
        }

        let duration = animate ? 3000 : 0;

        this.$('.window-messages > div:last-child').velocity('stop').velocity('scroll', {
            container: this.$messagePanel,
            duration: duration,
            easing: 'spring',
            begin: function() {
                this.$messagePanel.css('overflow-y', 'hidden');
                this.set('scrolling', true);
            }.bind(this),
            complete: function() {
                this.$messagePanel.css('overflow-y', 'auto');
                this.set('scrolling', false);
                this._showImages();
            }.bind(this)
        });
    },

    _addScrollHandler() {
        this.$messagePanel.on('scroll', _.throttle(Ember.run.bind(this, function() {
            if (this.get('animating') || this.get('scrolling')) {
                return;
            }

            let $panel = this.$messagePanel;
            let scrollPos = $panel.scrollTop();

            if (scrollPos + $panel.innerHeight() >= $panel.prop('scrollHeight')) {
                this.set('content.scrollLock', false);
                this.set('content.newMessagesCount', 0);
                Ember.Logger.info('scrollock off');
            } else if (!this.get('content.deletedLine')) {
                this.set('content.scrollLock', true);
                Ember.Logger.info('scrollock on');
            }

            this.set('content.deletedLine', false); // Hack
            this._showImages();
        }, 100)));
    },

    _updateImages() {
        if (this.$images === null) {
            this.$images = $([]);
        }

        this.$images = this.$images.add(this.$('img[data-src]'));
    },

    _showImages() {
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
                    that._goToBottom(true);
                });

                return false;
            }

            return true;
        });
    }
});
