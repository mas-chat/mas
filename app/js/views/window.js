'use strict';

App.WindowView = Ember.View.extend({
    classNames: ['window', 'flex-grow-column', 'flex-1'],

    scrollToBottom: function() {
        // TBD Why exactly is run.next() needed?
        Ember.run.next(this, function() {
            var $messagePanel = this.$('.window-messages');
            $messagePanel.scrollTop($messagePanel.prop('scrollHeight') + 1000);
        });
    },

    onChildViewsChanged: function() {
        this.scrollToBottom();
    }.observes('childViews'),

    didInsertElement: function() {
        this.scrollToBottom();

        // Highlight the window that was moved
        if (this.get('controller.model.animate') === true) {
            this.set('controller.model.animate', false);
            this.$().addClass('tada animated');
        }
    }
});