
exports.setup = function(casper) {
    function captureAndExit() {
        casper.log('Test failed. Taking screenshot', 'info');
        casper.capture('fail.png');
        casper.exit(1);
    }

    casper.on('page.error', function(msg, trace) {
        this.echo('Error on page: ' + msg + 'Trace: ' + trace);
        captureAndExit();
    });
};

exports.clearDb = function(casper) {
    casper.thenOpen('http://localhost:44199/dev/reset');
    casper.waitForText('OK');
};

exports.registerUser = function(casper, test, options) {
    casper.thenOpen('http://localhost:44199/register');

    casper.waitForResource(/pages-libs\.js$/, function() {
        test.assertTitle('MAS - Register', 'MAS register page title is the one expected');
        test.assertExists('form[action="/register"]', 'Main form is found');
        this.fill('form[action="/register"]', {
            name: options.name,
            email: options.email,
            password: options.password,
            confirm: options.password,
            nick: options.nick,
            tos: true
        }, true);
    });

    casper.waitForText('Welcome!', function() {
        test.assertUrlMatch(/\/app$/, 'Was redirected to the app');
    });
};

exports.loginUser = function(casper, test, options) {
    casper.thenOpen('http://localhost:44199');

    casper.waitForResource(/pages-libs\.js$/, function() {
        this.fill('form#login-form', {
            username: options.username,
            password: options.password
        }, true);
    });
};
