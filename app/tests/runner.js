if (window.location.search.indexOf("?test") !== -1) {
  document.write(
    '<div id="qunit"></div>' +
    '<div id="qunit-fixture"></div>' +
    '<div id="ember-testing-container">' +
    '  <div id="ember-testing"></div>' +
    '</div>' +
    '<link rel="stylesheet" href="tests/runner.css">' +
    '<link rel="stylesheet" href="/vendor/qunit/qunit/qunit.css">' +
    '<script src="/vendor/qunit/qunit/qunit.js"></script>' +
    '<script src="tests/tests.js"></script>'
  )
}
