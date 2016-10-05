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

/* globals $ */

import Ember from 'ember';
import Ps from 'npm:perfect-scrollbar';
import Favico from 'npm:favico.js';
import isMobile from 'npm:ismobilejs';
import { dispatch } from 'emflux/dispatcher';
import { play } from '../../../utils/sound';
import { calcMsgHistorySize } from '../../../utils/msg-history-sizer';

let faviconCounter = 0;

const favicon = new Favico({
    animation:'slide'
});

document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        faviconCounter = 0;
        favicon.reset();
    }
});

export default Ember.Component.extend({
    stores: Ember.inject.service(),

    classNames: [ 'window', 'flex-grow-column' ],

    classNameBindings: [
        'animating:velocity-animating:',
        'expanded:expanded:',
        'visible:visible:hidden',
        'ircServerWindow:irc-server-window:',
        'type'
    ],

    activeDesktop: Ember.computed.alias('stores.settings.activeDesktop'),

    expanded: false,
    animating: false,
    scrollLock: false,
    fetchingMore: false,
    noOlderMessages: false,
    notDelivered: false,

    linesAmount: null,
    deletedLine: false,
    prependPosition: 0,

    $messagePanel: null,
    $messagesEndAnchor: null,
    logModeEnabled: false,
    scrollHandlersAdded: false,
    elementInserted: false,

    scrollTimer: null,
    lazyImageTimer: null,

    participants: null,

    row: Ember.computed.alias('content.row'),
    column: Ember.computed.alias('content.column'),
    desktop: Ember.computed.alias('content.desktop'),

    visible: Ember.computed('activeDesktop', 'content.desktop', function() {
        return this.get('activeDesktop') === this.get('content.desktop');
    }),

    logOrMobileModeEnabled: Ember.computed('logModeEnabled', function() {
        return this.get('logModeEnabled') || isMobile.any;
    }),

    fullBackLog: Ember.computed('content.messages.[]', function() {
        return this.get('content.messages.length') >= this.get('stores.windows.maxBacklogMsgs');
    }),

    beginningReached: Ember.computed('fullBackLog', 'noOlderMessages', function() {
        return !this.get('fullBackLog') || (this.get('noOlderMessages'));
    }),

    ircServerWindow: Ember.computed('content.userId', function() {
        return this.get('content.userId') === 'i0' ? 'irc-server-window' : '';
    }),

    isGroup: Ember.computed('content.type', function() {
        return this.get('content.type') === 'group';
    }),

    type: Ember.computed('content.type', function() {
        if (this.get('content.type') === 'group') {
            return 'group';
        } else if (this.get('content.userId') === 'i0') {
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

    visibilityChanged: function() {
        if (this.get('visible') && !this.get('scrollLock')) {
            this.set('content.newMessagesCount', 0);
        }

        if (this.get('elementInserted')) {
            this.sendAction('relayout', { animate: false });
        }
    }.observes('visible').on('init'),

    nickCompletion: function() {
        Ember.run.debounce(this, function() {
            this.set('participants',
                this.get('content.operatorNames').concat(this.get('content.voiceNames'),
                    this.get('content.userNames')));
        }, 1000);
    }.observes('content.userNames.[]', 'content.voiceNames.[]',
       'content.operatorNames.[]').on('init'),

    _lineAdded(messages) {
        // Get the message that was added. Note: .get('lastObject') would work only after this
        // run loop. Also note that messages is IndexArray and everything must be accessed using
        // .get()
        let message = messages.content[messages.get('length') - 1];

        let cat = message.cat;
        let importantMessage = cat === 'msg' || cat === 'action';

        if ((!this.get('visible') || this.get('scrollLock')) && importantMessage) {
            this.incrementProperty('content.newMessagesCount');
        }

        if (document.hidden && importantMessage) {
            // Browser title notification
            if (this.get('content.alerts.title')) {
                favicon.badge(++faviconCounter);
            }

            // Sound notification
            if (this.get('content.alerts.sound')) {
                play();
            }

            if (this.get('content.alerts.notification') && 'Notification' in window &&
                Notification.permission !== 'denied' && cat === 'msg') {
                let src = message.get('type') === 'group' ? message.get('simplifiedName') : '1on1';

                let ntf = new Notification(`${message.get('nick')} (${src})`, {
                    body: message.get('body'),
                    icon: message.get('avatarUrl')
                });

                setTimeout(() => ntf.close(), 5000);
            }
        }

        // Remove the oldest message if the optimal history is visible
        if (messages.get('length') > calcMsgHistorySize()) {
            // TODO: Do in store
            this.get('content.messages').removeModel(messages.sortBy('ts')[0]);
            this.deletedLine = true;
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
            dispatch('TOGGLE_MEMBER_LIST_WIDTH', {
                window: this.get('content')
            });

            Ember.run.scheduleOnce('afterRender', this, function() {
                this._goToBottom(true);
            });
        },

        processLine(msg) {
            dispatch('PROCESS_LINE', {
                body: msg,
                window: this.get('content')
            });
        },

        editMessage(gid, msg) {
            dispatch('EDIT_MESSAGE', {
                body: msg,
                gid: gid,
                window: this.get('content')
            });
        },

        deleteMessage(gid) {
            dispatch('EDIT_MESSAGE', {
                body: '',
                gid: gid,
                window: this.get('content')
            });
        },

        close() {
            dispatch('CLOSE_WINDOW', {
                window: this.get('content')
            });
        },

        menu(modalName) {
            dispatch('OPEN_MODAL', {
                name: modalName,
                model: this.get('content')
            });
        },

        jumpToBottom() {
            this.set('scrollLock', false);
            this._goToBottom(true);
        },

        fetchMore() {
            this._requestMoreMessages();
        },

        upload(files) {
            dispatch('UPLOAD_FILES', {
                files: files,
                window: this.get('content')
            });

            this.$('input[name="files"]').val('');
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
        if ($(event.target).hasClass('fa-arrows')) {
            event.preventDefault();
            this.sendAction('dragWindowStart', this, event);
        }
    },

    didInsertElement() {
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

        let membersEl = this.$('.window-members')[0];
        const network = this.get('content.network');

        if (membersEl) {
            Ps.initialize(membersEl);
        }

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

                if (action === 'chat') {
                    dispatch('START_CHAT', {
                        userId: selectedUserId,
                        network: network
                    });
                } else {
                    dispatch('REQUEST_FRIEND', {
                        userId: selectedUserId
                    });
                }

                e.preventDefault();
            }
        });

        this.$('.window-members').click(function(e) {
            $(this).contextmenu('show', e);
            e.preventDefault();
            return false;
        });

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

        this.$('.btn-file input').change(e => this.send('upload', e.target.files));

        this.sendAction('relayout', { animate: false });

        this.get('content.messages').addArrayObserver(this);
    },

    arrayWillChange() {},

    arrayDidChange(array, offset, removeCount, addCount) {
        if (addCount > 0 && this.get('stores.windows.initDone') &&
            offset === array.get('length') - 1) {
            // Infinity scrolling adds the old messages to the beginning of the array. The offset
            // check above makes sure that _lineAdded() is not called then (FETCH case).
            this._lineAdded(array);
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

    willRender() {
        if (this.didPrepend) {
            let $panel = this.$messagePanel;
            let toBottom = $panel.prop('scrollHeight') - $panel.scrollTop();

            this.prependPosition = toBottom;
        }
    },

    didRender() {
        if (this.didPrepend) {
            let $panel = this.$messagePanel;
            let oldPos = $panel.prop('scrollHeight') - this.prependPosition;

            $panel.scrollTop(oldPos)
            this.didPrepend = false;
        }
    },

    _goToBottom(animate, callback) {
        if (this.get('scrollLock') || !this.$messagesEndAnchor) {
            return;
        }

        let duration = animate ? 200 : 0;

        this.$messagesEndAnchor.velocity('stop').velocity('scroll', {
            container: this.$messagePanel,
            duration: duration,
            easing: 'spring',
            offset: -1 * this.$messagePanel.innerHeight() + 15, // 5px padding plus some extra
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

            const scrollBottomThreshold = 30; // User doesn't need to scroll exactly to the end.
            const scrollTopThreshold = 30; // Or to up to trigger fetching of more messages.

            let bottomPosition = $panel.prop('scrollHeight') - scrollBottomThreshold;
            let topPosition = scrollTopThreshold;

            if (scrollPos < topPosition) {
                this._requestMoreMessages();
            }

            if (scrollPos + $panel.innerHeight() >= bottomPosition) {
                this.set('scrollLock', false);

                if (this.get('visible')) {
                    // TODO: Mutates store
                    this.set('content.newMessagesCount', 0);
                }

                Ember.Logger.info('scrollock off');
            } else if (!this.deletedLine) {
                this.set('scrollLock', true);

                Ember.Logger.info('scrollock on');
            }

            this.deletedLine = false; // A hack
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

                if (!message) {
                    return;
                }

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
                $image.parent().hide(); // Container list element
            }

            Ember.run(function() {
                Ember.Logger.info('Lazy loaded image');
                that._goToBottom(true);
            });
        });
    },

    _requestMoreMessages() {
        if (this.get('fetchingMore') || this.get('noOlderMessages')) {
            return;
        }

        this.set('fetchingMore', true);

        dispatch('FETCH_OLDER_MESSAGES', {
            window: this.get('content')
        },
        (foundMessages) => {
            if (foundMessages) {
                this.didPrepend = true;
            } else {
                this.set('noOlderMessages', true);
            }

            this.set('fetchingMore', false);
        });
    }
});
