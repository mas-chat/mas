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

/* globals $, FileAPI, emojify, titlenotifier, isMobile */

import Ember from 'ember';
import { play } from '../../../helpers/sound';
import UploadMixin from '../../../mixins/upload';

export default Ember.Component.extend(UploadMixin, {
    classNames: [ 'window', 'flex-grow-column' ],

    classNameBindings: [
        'animating:velocity-animating:',
        'expanded:expanded:',
        'visible:visible:hidden',
        'ircServerWindow:irc-server-window:',
        'type'
    ],

    expanded: false,
    animating: false,
    scrollLock: false,

    linesAmount: null,
    deletedLine: false,

    $messagePanel: null,
    $messagesEndAnchor: null,
    logModeEnabled: false,
    scrollHandlersAdded: false,
    elementInserted: false,

    scrollTimer: null,
    lazyImageTimer: null,

    selectedDesktop: 0,

    row: Ember.computed.alias('content.row'),
    column: Ember.computed.alias('content.column'),
    desktop: Ember.computed.alias('content.desktop'),

    visible: Ember.computed('selectedDesktop', 'content.desktop', function() {
        return this.get('selectedDesktop') === this.get('content.desktop');
    }),

    logOrMobileModeEnabled: Ember.computed('logModeEnabled', function() {
        return this.get('logModeEnabled') || isMobile.any;
    }),

    ircServerWindow: Ember.computed('content.userId', function() {
        return this.get('content.userId') === 'iSERVER' ? 'irc-server-window' : '';
    }),

    isGroup: Ember.computed('content.type', function() {
        return this.get('content.type') === 'group';
    }),

    type: Ember.computed('content.type', function() {
        if (this.get('content.type') === 'group') {
            return 'group';
        } else if (this.get('content.userId') === 'iSERVER') {
            return 'server-1on1';
        } else {
            return 'private-1on1';
        }
    }),

    hiddenIfLogMode: Ember.computed('logModeEnabled', function() {
        return this.get('logModeEnabled') ? 'hidden' : '';
    }),

    hiddenIfMinimizedUserNames: Ember.computed('content.minimizedNamesList', function() {
        return this.get('content.minimizedNamesList') ? 'hidden' : '';
    }),

    wideUnlessminimizedNamesList: Ember.computed('content.minimizedNamesList', function() {
        return this.get('content.minimizedNamesList') ? '' : 'window-members-wide';
    }),

    windowChanged: Ember.observer('row', 'column', 'desktop', function() {
        if (this.get('elementInserted')) {
            this.sendAction('relayout', { animate: true });
        }
    }),

    visibilityChanged: Ember.observer('visible', function() {
        if (this.get('visible')) {
            this.set('content.newMessagesCount', 0);
        }

        if (this.get('elementInserted')) {
            this.sendAction('relayout', { animate: false });
        }
    }),

    nickCompletion: Ember.observer('content.userNames.@each', 'content.voiceNames.@each',
        'content.operatorNames.@each', function() {
        this._updateNickCompletionList();
    }),

    _updateNickCompletionList() {
        let target = this.$('.form-control');

        if (!target) {
            return;
        }

        let nickList = this.get('content.operatorNames').concat(this.get('content.voiceNames'),
            this.get('content.userNames')).map(item => item.nick);

        target.atwho({
            at: '@',
            data: nickList,
            limit: 15
        });
    },

    _lineAdded() {
        let messages = this.get('content.messages');
        let cat = messages[messages.length - 1].cat; // Message that was just added.
        let importantMessage = cat === 'msg' || cat === 'error' || cat === 'action';

        if ((!this.get('visible') || this.get('scrollLock')) && importantMessage) {
            this.incrementProperty('content.newMessagesCount');
        }

        if (document.hidden && importantMessage) {
            // Browser title notification
            if (this.get('content.titleAlert')) {
                titlenotifier.add();
            }

            // Sound notification
            if (this.get('content.soundAlert')) {
                play();
            }
        }

        Ember.run.scheduleOnce('afterRender', this, function() {
            this._goToBottom(true);
        });
    },

    actions: {
        expand() {
            this.set('expanded', true);
            this.sendAction('relayout', { animate: true });
        },

        compress() {
            this.set('expanded', false);
            this.sendAction('relayout', { animate: true });
        },

        browse() {
            this.set('logModeEnabled', true);
            this.set('expanded', true);
            this.sendAction('relayout', { animate: true });
        },

        toggleMemberListWidth() {
            this.toggleProperty('content.minimizedNamesList');
        },

        sendMessage() {
            let message = this.get('newMessage');

            if (message) {
                this.sendAction('action', 'sendMessage', this.get('content'), message);
                this.set('newMessage', '');
            }
        },

        close() {
            this.sendAction('action', 'close', this.get('content'));
        },

        menu(operation) {
            this.sendAction('menuAction', operation, this.get('content'));
        },

        jumpToBottom() {
            this.set('scrollLock', false);
            this._goToBottom(true);
        },

        hideImages(message) {
            message.set('hideImages', true);
        }
    },

    move(dim, duration) {
        this.set('animating', true);

        this.$().velocity('stop').velocity(dim, {
            duration: duration,
            visibility: 'visible',
            complete: Ember.run.bind(this, function() {
                this.set('animating', false);
                this._goToBottom(false, () => {
                    this._showImages(); // Make sure window shows the images after scrolling
                });
            })
        });
    },

    mouseDown(event) {
        if (!$(event.target).hasClass('fa-arrows')) {
            return; // Not moving the window
        }

        event.preventDefault();
        this.sendAction('dragWindowStart', this, event);
    },

    didInsertElement() {
        let that = this;

        this.sendAction('register', this);
        this.set('elementInserted', true);

        this.$messagePanel = this.$('.window-messages');
        this.$messagesEndAnchor = this.$('.window-messages-end');

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
                    `<img class="menu-avatar" src="${avatar}">${selectedNick}`);

                // Only MAS users can be added to a contacts list.
                $('.window-contexMenu-request-friend').toggle(selectedUserId.charAt(0) === 'm');

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
            data: emojisList,
            highlightFirst: false,
            limit: 20
        });

        this._updateNickCompletionList();

        this.$messagePanel.magnificPopup({
            type: 'image',
            delegate: '.user-img:not(.user-img-close)',
            closeOnContentClick: true,
            image: {
                verticalFit: false,
                titleSrc(item) {
                    let href = item.el.attr('href');

                    return '<small>Link to the original image:</small><a href="' + href +
                        '" target="_blank">' + href + '</a>';
                }
            }
        });

        let fileInput = this.$('.btn-file input')[0];

        FileAPI.event.on(fileInput, 'change', function(evt) {
            let files = FileAPI.getFiles(evt); // Retrieve file list
            this.send('upload', files, 'jpeg');
        }.bind(this));

        this.sendAction('relayout', { animate: false });

        this.get('content.messages').addArrayObserver(this);
    },

    arrayWillChange: function(array, offset, removeCount) {
        if (removeCount > 0) {
           this.set('deletedLine', true);
        }
    },

    arrayDidChange: function(array, offset, removeCount, addCount){
        if (addCount > 0) {
           this._lineAdded();
        }
    },

    willDestroyElement() {
        this.$messagesEndAnchor.velocity('stop');
        this.$().velocity('stop');

        this.sendAction('unregister', this);

        Ember.run.cancel(this.scrollTimer);
        Ember.run.cancel(this.lazyImageTimer);

        Ember.run.scheduleOnce('afterRender', this, function() {
            this.sendAction('relayout', { animate: true });
        });
    },

    _goToBottom(animate, callback) {
        if (this.get('scrollLock') || !this.$messagesEndAnchor) {
            return;
        }

        // TBD: Temporary trace to help to debug a rare bug. Remove when not needed.
        Ember.Logger.info(`${this.get('content.simplifiedName')} scrolling, animate: ${animate}`);

        let duration = animate ? 200 : 0;

        // There's an odd bug(?) in Chrome where extra empty space is added to the end of message
        // backlog. User can scroll beyond end of backlog. I currently suspect it happens CSS
        // rotation (load image spinner) and scrolling happen at the same time. Problem is not
        // related to velocity.js. It happens with jQuery.scrollTop() as well.

        this.$messagesEndAnchor.velocity('stop').velocity('scroll', {
            container: this.$messagePanel,
            duration: duration,
            easing: 'spring',
            offset: -1 * this.$messagePanel.innerHeight() + 5, // 5px is padding
            complete: Ember.run.bind(this, function() {
                if (callback) {
                    callback();
                }

                if (!this.scrollHandlersAdded) {
                    this._addScrollHandler();
                    this._addLazyImageScrollHandler();
                    this.scrollHandlersAdded = true;
                }
            })
        });
    },

    _addScrollHandler() {
        let handler = function() {
            if (this.get('animating')) {
                return;
            }

            let $panel = this.$messagePanel;
            let scrollPos = $panel.scrollTop();

            // User doesn't need to scroll exactly to the end.
            let bottomTreshhold = $panel.prop('scrollHeight') - 5;

            if (scrollPos + $panel.innerHeight() >= bottomTreshhold) {
                this.set('scrollLock', false);
                Ember.Logger.info('scrollock off');
            } else if (!this.get('deletedLine')) {
                this.set('scrollLock', true);
                Ember.Logger.info('scrollock on');
            }

            this.set('deletedLine', false); // Hack
        };

        this.$messagePanel.on('scroll', () => {
            // Delay nust be longer than goToBottom animation
            this.scrollTimer = Ember.run.throttle(this, handler, 250, false);
        });
    },

    _addLazyImageScrollHandler() {
        this.$messagePanel.on('scroll', () => {
            this.lazyImageTimer = Ember.run.throttle(this, this._showImages, 250, true);
        });
    },

    _showImages() {
        let $imgContainers = this.$('ul[data-has-images="true"]');

        if (!$imgContainers) {
            return;
        }

        const placeHolderHeight = 31;
        let panelHeight = this.$messagePanel.height();
        let that = this;

        $imgContainers.each(function() {
            let $imgContainer = $(this);
            // We want to know image's position in .window-messages container div. For position()
            // to work correctly, .window-messages has to have position set to 'relative'. See
            // jQuery offsetParent() documentation for details.
            let pos = $imgContainer.position().top;

            if (pos + placeHolderHeight >= 0 && pos <= panelHeight) {
                // Images of this message are in view port. Start to lazy load images.
                let message = that.get('content.messages').findBy('gid', $imgContainer.data('gid'));
                let images = message.get('images') || [];

                for (let i = 0; i < images.length; i++) {
                    let image = images[i];

                    if (!image.get('source')) {
                        // Image hasn't been already loaded
                        that._loadImage(image, $imgContainer, i);
                    }
                }
            }
        });
    },

    _loadImage(image, $container, index) {
        image.set('source', image.get('url'));

        let $image = $container.find('img').eq(index);
        let that = this;

        $image.one('load error', function(e) {
            if (e.type === 'error') {
                $image.hide();
            }

            Ember.run(function() {
                Ember.Logger.info('Lazy loaded image');
                that._goToBottom(true);
            });
        });
    }
});
