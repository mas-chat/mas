'use strict';

App.WindowView = Ember.View.extend({
    classNames: ['window', 'flex-grow-column', 'flex-1'],
    $messagePanel: 0,
    scrolling: false,

    scrollToBottom: function() {
        if (!this.get('scrolling')) {
            var duration = this.$messagePanel.scrollTop() === 0 ? 1 : 800;
            var that = this;

            this.$messagePanel.stop().animate({
                scrollTop: this.$messagePanel.prop('scrollHeight')
            }, duration, function() {
                that.set('scrolling', false);
            });

            this.set('scrolling', true);
        }
    },

    onChildViewsChanged: function() {
        if (this.$messagePanel) {
            this.scrollToBottom();
        }
    }.observes('childViews'),

    didInsertElement: function() {
        this.$messagePanel = this.$('.window-messages');
        this.$().on('load', 'img', $.proxy(this.scrollToBottom, this));
        this.scrollToBottom();

        // Highlight the window that was moved
        if (this.get('controller.model.animate') === true) {
            this.set('controller.model.animate', false);
            this.$().addClass('pulse animated');
        }
    },

    willDestroyElement: function(){
        this.$().off('load', 'img', $.proxy(this.scrollToBottom, this));
    }
});