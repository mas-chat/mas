// in order to see the app running inside the QUnit runner
Mas.rootElement = '#ember-testing';

// Common test setup
Mas.setupForTesting();
Mas.injectTestHelpers();

// common QUnit module declaration
module("Integration tests", {
  setup: function() {
    // before each test, ensure the application is ready to run.
    Ember.run(Mas, Mas.advanceReadiness);
  },

  teardown: function() {
    // reset the application state between each test
    Mas.reset();
  }
});

// QUnit test case
test("/", function() {
  // async helper telling the application to go to the '/' route
  visit("/");

  // helper waiting the application is idle before running the callback
  andThen(function() {
    equal(find("h2").text(), "Welcome to Ember.js", "Application header is rendered");
    equal(find("li").length, 3, "There are three items in the list");
  });
});
