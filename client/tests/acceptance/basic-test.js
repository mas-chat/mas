import Ember from 'ember';
import {
  module,
  test
} from 'qunit';
import startApp from 'mas/tests/helpers/start-app';

var application;

module('Acceptance: Basic', {
  beforeEach: function() {
    application = startApp();
  },

  afterEach: function() {
    Ember.run(application, 'destroy');
  }
});

test('visiting /app', function(assert) {
  visit('/app');

  andThen(function() {
    assert.equal(currentPath(), 'app');
  });
});
